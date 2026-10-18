/**
 * Host half of the plugin update checker.
 *
 * The plugin owns one row. It reads the installed bundles from
 * `ctx.pluginManager`, asks the ordered metadata sources in the background,
 * caches one report for the browser, and serves that report over the
 * authenticated Connection `/api` channel. It never installs, removes, or
 * enables anything: updating stays a user action.
 *
 * @module @wha7ever/dsh-plugin-updates
 */

import { compareVersions, isPrerelease } from './semver.js'
import {
  buildRegistryPlan,
  fetchGithubVersion,
  fetchOfficialVersion,
  fetchTagVersion,
  messageOf,
  parseSource,
  sanitizeSource,
  SourceHealth,
} from './sources.js'

/** Package name used in effect labels and the RPC channel. */
const PACKAGE_NAME = '@wha7ever/dsh-plugin-updates'
/** Services required by the Host half. */
export const inject = ['pluginManager']
/** Exact authenticated route the browser half calls. */
const ROUTE = '/api/plugin-updates'
/** RPC channel name the browser half passes to `connection.rpc.call`. */
const RPC_CHANNEL = 'plugin-updates'
/** Official package whose release line the official bundles follow. */
const DSH_PACKAGE = '@deepseek-ai/dsh'
const DEFAULT_STARTUP_DELAY_MS = 8000
const DEFAULT_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000
const DEFAULT_REQUEST_TIMEOUT_MS = 3000
const DEFAULT_GITHUB_TIMEOUT_MS = 2500
const DEFAULT_CONCURRENCY = 4
const DEFAULT_CHANGE_DEBOUNCE_MS = 1000
const FAILURE_RETRY_MS = 5 * 60 * 1000

/**
 * Clamp an optional numeric config field.
 * @param {unknown} value - configured value.
 * @param {number} fallback - value used when the field is absent or invalid.
 * @param {number} min - lower bound.
 * @param {number} max - upper bound.
 * @returns {number} a finite integer in range.
 */
function numberField(value, fallback, min, max) {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.floor(number)))
}

/**
 * Read the row's raw config with defaults.
 * @param {unknown} config - Loader row config.
 * @returns {object} normalized checker options.
 */
function readOptions(config) {
  const source = config !== null && typeof config === 'object' ? config : {}
  return {
    enabled: source.enabled !== false,
    startupDelayMs: numberField(source.startupDelayMs, DEFAULT_STARTUP_DELAY_MS, 0, 10 * 60 * 1000),
    refreshIntervalMs: numberField(source.refreshIntervalMs, DEFAULT_REFRESH_INTERVAL_MS, 60 * 1000, 7 * 24 * 60 * 60 * 1000),
    requestTimeoutMs: numberField(source.requestTimeoutMs, DEFAULT_REQUEST_TIMEOUT_MS, 500, 30000),
    githubTimeoutMs: numberField(source.githubTimeoutMs, DEFAULT_GITHUB_TIMEOUT_MS, 500, 30000),
    concurrency: numberField(source.concurrency, DEFAULT_CONCURRENCY, 1, 8),
    changeDebounceMs: numberField(source.changeDebounceMs, DEFAULT_CHANGE_DEBOUNCE_MS, 0, 60000),
    circuitBreakerFailures: numberField(source.circuitBreakerFailures, 2, 1, 10),
    circuitBreakerCooldownMs: numberField(source.circuitBreakerCooldownMs, 10 * 60 * 1000, 30 * 1000, 24 * 60 * 60 * 1000),
    fallbackSources: Array.isArray(source.fallbackSources)
      ? source.fallbackSources.filter((name) => typeof name === 'string')
      : ['npmjs', 'tencent', 'jsdelivr', 'npmx'],
    githubProxy: typeof source.githubProxy === 'string' ? source.githubProxy : '',
    packageLink: source.packageLink === 'npmjs' ? 'npmjs' : 'npmx',
    includeOfficial: source.includeOfficial !== false,
    includeThirdParty: source.includeThirdParty !== false,
  }
}

/** @param {unknown} value @returns {string | undefined} a string title when the meta carries one. */
function readTitle(meta) {
  if (meta === null || typeof meta !== 'object') return undefined
  return typeof meta.title === 'string' ? meta.title : undefined
}

/** @param {string} name @param {{ packageLink: string }} options @returns {string} the package page link. */
function packageUrl(name, options) {
  const base = options.packageLink === 'npmjs' ? 'https://www.npmjs.com/package/' : 'https://npmx.dev/package/'
  return `${base}${name}`
}

/** @param {string | null} profile @param {string} spec @returns {string} a copyable upgrade command. */
function commandFor(profile, spec) {
  return `dsh plugin --profile ${profile ?? '<profile>'} add "${spec}"`
}

/** @param {Array<string | null | undefined>} values @returns {string[]} non-empty unique values. */
function unique(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value !== ''))]
}

/**
 * Run one async worker per item, up to a concurrency limit.
 * @template T, R
 * @param {T[]} items - work items.
 * @param {number} limit - maximum concurrent workers.
 * @param {(item: T) => Promise<R>} run - per-item operation.
 * @returns {Promise<R[]>} results in input order.
 */
async function mapLimit(items, limit, run) {
  const results = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = next++
      if (index >= items.length) return
      results[index] = await run(items[index])
    }
  })
  await Promise.all(workers)
  return results
}

/**
 * Build one unknown/current/update item for an installed bundle.
 * @param {object} bundle - `BundleInfo`.
 * @param {{ options: object, plan: object[], health: SourceHealth, signal: AbortSignal, profile: string | null }} context - sweep context.
 * @returns {Promise<object>} the report item.
 */
async function checkBundle(bundle, context) {
  const name = typeof bundle.name === 'string' ? bundle.name : ''
  const installed = typeof bundle.version === 'string' && bundle.version !== '' ? bundle.version : null
  const displaySource = sanitizeSource(bundle.source)
  const parsed = parseSource(name, bundle.source)
  const description = typeof bundle.description === 'string' ? bundle.description : undefined
  const title = readTitle(bundle.meta)
  const base = {
    name,
    ...(title === undefined ? {} : { title }),
    ...(description === undefined ? {} : { description }),
    version: installed,
    latest: null,
    status: 'unknown',
    sourceKind: parsed.kind,
    source: displaySource,
    channel: null,
    checkedFrom: null,
    reason: null,
    npmUrl: packageUrl(name, context.options),
    command: null,
  }
  if (installed === null) return { ...base, reason: 'no-version' }
  if (parsed.kind === 'local') return { ...base, reason: 'local' }
  if (parsed.kind === 'tarball') return { ...base, reason: 'tarball' }
  if (parsed.kind === 'unknown') return { ...base, reason: parsed.reason ?? 'invalid' }
  if (parsed.kind === 'git') {
    if (parsed.git === undefined) return { ...base, reason: 'git' }
    const result = await fetchGithubVersion(parsed.git, context.options, context.health, context.signal)
    if (result.version === undefined) return { ...base, reason: 'git', checkedFrom: result.checkedFrom ?? null }
    const update = compareVersions(result.version, installed) > 0
    return {
      ...base,
      latest: result.version,
      status: update ? 'update' : 'current',
      channel: 'git',
      checkedFrom: result.checkedFrom ?? null,
      command: update ? commandFor(context.profile, parsed.recorded ?? bundle.source) : null,
    }
  }

  const channels = parsed.tag !== null && parsed.tag !== undefined
    ? [parsed.tag]
    : isPrerelease(installed)
      ? ['next', 'latest']
      : ['latest']
  const result = await fetchTagVersion(name, channels, context.plan, context.options, context.health, context.signal)
  if (result.auth === true) return { ...base, reason: 'private', checkedFrom: result.source ?? null }
  if (result.version === undefined) {
    return { ...base, reason: result.notFound === true ? 'not-found' : 'network' }
  }
  const update = compareVersions(result.version, installed) > 0
  return {
    ...base,
    latest: result.version,
    status: update ? 'update' : 'current',
    channel: result.channel ?? null,
    checkedFrom: result.source ?? null,
    reason: parsed.range === true ? 'range' : null,
    command: update ? commandFor(context.profile, `${name}@${result.version}`) : null,
  }
}

/**
 * Compare the official release line with the running DSH version.
 * @param {string} runtime - running DSH version.
 * @param {number} bundleCount - installed official bundle count.
 * @param {{ options: object, plan: object[], health: SourceHealth, signal: AbortSignal }} context - sweep context.
 * @returns {Promise<object>} the official report node.
 */
async function checkOfficial(runtime, bundleCount, context) {
  const channels = isPrerelease(runtime) ? ['next', 'latest'] : ['latest']
  const result = await fetchOfficialVersion(DSH_PACKAGE, channels, context.plan, context.options, context.health, context.signal)
  const base = {
    runtime,
    latest: null,
    channel: null,
    updateAvailable: false,
    bundleCount,
    checkedFrom: null,
    error: null,
  }
  if (result.auth === true) return { ...base, error: 'private', checkedFrom: result.source ?? null }
  if (result.version === undefined) {
    // A third-party check may already have cooled the private source down, so
    // the official check can see no answer at all. The health table still
    // remembers that the source wants credentials.
    if (context.health.authSources().length > 0) return { ...base, error: 'private' }
    return { ...base, error: result.error === undefined ? 'not-found' : messageOf(result.error) }
  }
  return {
    ...base,
    latest: result.version,
    channel: result.channel ?? null,
    updateAvailable: compareVersions(result.version, runtime) > 0,
    checkedFrom: result.source ?? null,
  }
}

/**
 * Build one full report from the live profile.
 * @param {{ ctx: any, options: object, plan: object[], health: SourceHealth, signal: AbortSignal, profile: string | null }} input - sweep input.
 * @returns {Promise<object>} the report.
 */
async function buildReport(input) {
  const { ctx, options, plan, health, signal, profile } = input
  const listed = await ctx.pluginManager.listBundles()
  const bundles = Array.isArray(listed) ? listed : []
  const officialBundles = bundles.filter((bundle) => bundle.official === true)
  const installedOfficial = officialBundles.filter((bundle) => bundle.installed === true || bundle.availability === 'installation')
  const runtime = officialBundles.find((bundle) => typeof bundle.version === 'string' && bundle.version !== '')?.version ?? null
  const thirdParty = bundles.filter((bundle) => bundle.official !== true
    && bundle.installed === true
    && bundle.availability === 'profile'
    && typeof bundle.source === 'string')
  const context = { options, plan, health, signal, profile }
  const items = options.includeThirdParty
    ? await mapLimit(thirdParty, options.concurrency, (bundle) => checkBundle(bundle, context))
    : []
  const official = options.includeOfficial && runtime !== null
    ? await checkOfficial(runtime, installedOfficial.length, context)
    : null
  const checkedFrom = unique([...items.map((item) => item.checkedFrom), official?.checkedFrom])
  return {
    available: true,
    enabled: options.enabled,
    profile,
    checkedAt: Date.now(),
    checking: false,
    stale: false,
    error: null,
    sources: checkedFrom,
    unavailableSources: health.unavailable(),
    official,
    items,
    counts: {
      thirdParty: items.length,
      official: installedOfficial.length,
      updates: items.filter((item) => item.status === 'update').length + (official?.updateAvailable === true ? 1 : 0),
      unknown: items.filter((item) => item.status === 'unknown').length,
    },
  }
}

/**
 * The empty report shown before the first successful sweep.
 * @param {object} options - checker options.
 * @param {string | null} profile - active profile name.
 * @returns {object} an empty report.
 */
function emptyReport(options, profile) {
  return {
    available: true,
    enabled: options.enabled,
    profile,
    checkedAt: null,
    checking: false,
    stale: false,
    error: null,
    sources: [],
    unavailableSources: [],
    official: null,
    items: [],
    counts: { thirdParty: 0, official: 0, updates: 0, unknown: 0 },
  }
}

/** @param {string} rpcId @param {unknown} result @returns {Response} the Connection envelope. */
function envelope(rpcId, result) {
  return Response.json({ type: 'server-response', rpcId, result })
}

/** @param {string} message @returns {object} an RPC failure value. */
function fail(message) {
  return { ok: false, error: { code: 'internal', message, details: {} } }
}

/**
 * Mount the Host half.
 * @param {any} ctx - Cordis context.
 * @param {unknown} config - row config.
 */
export function apply(ctx, config) {
  const options = readOptions(config)
  const health = new SourceHealth({ failures: options.circuitBreakerFailures, cooldownMs: options.circuitBreakerCooldownMs })
  const lifetime = new AbortController()
  const profile = typeof process.env.DSH_PROFILE === 'string' && process.env.DSH_PROFILE !== '' ? process.env.DSH_PROFILE : null
  const empty = emptyReport(options, profile)
  let cached = null
  let pending = null
  let startupTimer
  let changeTimer

  /** @returns {object} the current browser-facing snapshot. */
  function snapshot() {
    const base = cached?.report ?? empty
    return {
      ...base,
      enabled: options.enabled,
      checking: pending !== null,
      stale: base.stale === true || (cached !== null && Date.now() > cached.expiresAt),
      unavailableSources: health.unavailable(),
    }
  }

  /** @returns {Promise<object>} one sweep, with its own failure report. */
  async function doRefresh() {
    try {
      const registries = await ctx.pluginManager.registries().catch(() => null)
      const plan = buildRegistryPlan(registries, options)
      const report = await buildReport({ ctx, options, plan, health, signal: lifetime.signal, profile })
      cached = { report, expiresAt: Date.now() + options.refreshIntervalMs }
      return report
    } catch (error) {
      const previous = cached?.report ?? empty
      const report = {
        ...previous,
        enabled: options.enabled,
        profile,
        error: messageOf(error),
        checking: false,
        stale: cached !== null,
        unavailableSources: health.unavailable(),
      }
      cached = { report, expiresAt: Date.now() + FAILURE_RETRY_MS }
      return report
    }
  }

  /**
   * Start one sweep or reuse the running one.
   * @param {boolean} [force] - bypass a fresh cache and reset source cooldowns.
   * @returns {Promise<object>} the report or the immediate snapshot.
   */
  function refresh(force = false) {
    if (!options.enabled) return Promise.resolve(snapshot())
    if (pending !== null) return pending
    if (!force && cached !== null && Date.now() <= cached.expiresAt) return Promise.resolve(snapshot())
    if (force) health.reset()
    pending = doRefresh().finally(() => { pending = null })
    return pending
  }

  ctx.effect(() => () => {
    lifetime.abort()
    if (startupTimer !== undefined) clearTimeout(startupTimer)
    if (changeTimer !== undefined) clearTimeout(changeTimer)
  }, `${PACKAGE_NAME}: lifetime`)

  ctx.effect(() => {
    const off = ctx.on('plugin-manager/changed', () => {
      // Keep the last successful report so a failed refresh still has something
      // to show; expire it instead of discarding it.
      if (cached !== null) cached = { report: cached.report, expiresAt: 0 }
      if (changeTimer !== undefined) clearTimeout(changeTimer)
      changeTimer = setTimeout(() => {
        changeTimer = undefined
        void refresh(false)
      }, options.changeDebounceMs)
    })
    return () => {
      off()
      if (changeTimer !== undefined) {
        clearTimeout(changeTimer)
        changeTimer = undefined
      }
    }
  }, `${PACKAGE_NAME}: plugin-manager changes`)

  ctx.inject(['connection'], (connectionCtx) => {
    connectionCtx.effect(() => connectionCtx.connection.fetch.register({
      path: ROUTE,
      methods: ['POST'],
      requestBody: 'buffered',
      async fetch(request) {
        let body
        try {
          body = await request.json()
        } catch {
          return new Response('body is not JSON', { status: 400 })
        }
        const rpcId = typeof body?.rpcId === 'string' ? body.rpcId : 'invalid-request'
        const call = body?.payload ?? {}
        try {
          if (call.endpoint !== 'report') return envelope(rpcId, fail(`unknown endpoint: ${String(call.endpoint)}`))
          const input = call.payload ?? {}
          const running = refresh(input.force === true)
          if (input.wait === true) await running
          return envelope(rpcId, { ok: true, value: snapshot() })
        } catch (error) {
          return envelope(rpcId, fail(messageOf(error)))
        }
      },
    }), `${PACKAGE_NAME}: ${ROUTE}`)

    connectionCtx.effect(() => {
      if (!options.enabled || options.startupDelayMs <= 0) return undefined
      startupTimer = setTimeout(() => {
        startupTimer = undefined
        void refresh(false)
      }, options.startupDelayMs)
      return () => {
        if (startupTimer !== undefined) {
          clearTimeout(startupTimer)
          startupTimer = undefined
        }
      }
    }, `${PACKAGE_NAME}: startup check`)
  })

}

export { ROUTE as route, RPC_CHANNEL as channel }
