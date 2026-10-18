// Offline harness for the Host half.
//
// Imports the REAL lib/index.js, mounts it on a fake Cordis context with the
// real `pluginManager` shape, intercepts `fetch`, and drives the registered
// Connection route. Nothing here needs a running harness: the checks cover the
// report, the source fallback, the circuit breaker, private registries, the
// startup timer, change invalidation, and stale data.
import * as plugin from '../lib/index.js'

const failures = []
const check = (condition, message) => {
  if (!condition) failures.push(message)
  console.log(`${condition ? 'ok  ' : 'FAIL'}  ${message}`)
}

const NPMMIRROR = 'https://registry.npmmirror.com/'

/** @param {unknown} body @param {number} [status] @returns {Response} a JSON response. */
function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

/** Build a fetched bundle record with the fields this plugin reads. */
function bundle(name, version, source, extra = {}) {
  return {
    name,
    version,
    source,
    official: false,
    installed: true,
    availability: 'profile',
    removable: true,
    enabled: true,
    optional: false,
    rows: [],
    overrides: [],
    ...extra,
  }
}

/** Mount the Host half on a fake Cordis context. */
function mount(input) {
  const routes = []
  const effects = []
  const listeners = new Map()
  const calls = []
  const state = {
    bundles: input.bundles,
    registries: input.registries ?? { registry: null, fallbackRegistries: [NPMMIRROR], resolved: NPMMIRROR },
    bundleError: false,
    respond: input.respond,
  }
  const previousFetch = globalThis.fetch
  globalThis.fetch = async (url, init) => {
    calls.push(String(url))
    return state.respond(String(url), init, state)
  }

  const ctx = {
    effect(fn) {
      const cleanup = fn()
      if (typeof cleanup === 'function') effects.push(cleanup)
      return () => {
        if (typeof cleanup === 'function') cleanup()
      }
    },
    on(name, callback) {
      const list = listeners.get(name) ?? []
      list.push(callback)
      listeners.set(name, list)
      return () => {
        const current = listeners.get(name) ?? []
        const index = current.indexOf(callback)
        if (index >= 0) current.splice(index, 1)
      }
    },
    inject(_names, callback) {
      const sub = {
        effect: ctx.effect,
        connection: {
          fetch: {
            register(route) {
              routes.push(route)
              return () => {}
            },
          },
        },
      }
      callback(sub)
      return () => {}
    },
    pluginManager: {
      async listBundles() {
        if (state.bundleError) throw new Error('profile unavailable')
        return state.bundles
      },
      async registries() {
        return state.registries
      },
    },
    logger: { warn() {}, info() {}, error() {}, debug() {} },
  }

  plugin.apply(ctx, { startupDelayMs: 0, changeDebounceMs: 5, ...input.config })
  return {
    routes,
    calls,
    state,
    emit(name) {
      for (const callback of listeners.get(name) ?? []) callback()
    },
    restore() {
      for (const cleanup of effects.reverse()) {
        try {
          cleanup()
        } catch {
          /* a fake cleanup must not hide the assertion results. */
        }
      }
      globalThis.fetch = previousFetch
    },
  }
}

/** Call the registered Connection route. */
async function rpc(routes, endpoint, payload = {}) {
  const route = routes.at(-1)
  const response = await route.fetch(new Request('http://127.0.0.1/api/plugin-updates', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ rpcId: 'test-request', payload: { endpoint, payload } }),
  }))
  const body = await response.json()
  return { status: response.status, route, body, value: body.result?.value }
}

/** Find a report item by package name. */
function item(report, name) {
  return report.items.find((entry) => entry.name === name)
}

/** A responder for the baseline fixture. */
function baselineRespond(url, _init, state) {
  if (url.includes('registry.npmmirror.com')) {
    if (url.includes('@wha7ever%2Fdsh-gotify-notify/latest')) return json({ version: '0.1.3' })
    if (url.includes('@wha7ever%2Fdsh-mcp-console/latest')) return json({ version: state.latestMcp ?? '0.1.1' })
    if (url.includes('dsh-better-reasoning-effort/latest')) return json({ version: '0.5.3' })
    if (url.includes('@deepseek-ai%2Fdsh/next')) return json({ version: state.nextDsh ?? '0.2.1-rc.3' })
    if (url.includes('@deepseek-ai%2Fdsh/latest')) return json({ version: '0.2.0' })
    return json({ error: 'not found' }, 404)
  }
  if (url.includes('raw.githubusercontent.com')) {
    if (url.includes('dsh-whale-widget/package.json')) return json({ version: '0.4.3' })
    return json({ error: 'not found' }, 404)
  }
  return json({ error: 'not found' }, 404)
}

//#region Baseline report
{
  const harness = mount({
    bundles: [
      bundle('@wha7ever/dsh-gotify-notify', '0.1.3', '@wha7ever/dsh-gotify-notify@latest'),
      bundle('@wha7ever/dsh-mcp-console', '0.1.0', '@wha7ever/dsh-mcp-console@0.1.0'),
      bundle('dsh-better-reasoning-effort', '0.5.3', 'dsh-better-reasoning-effort@0.5.3'),
      bundle('dsh-whale-widget', '0.4.2', 'github:wha7ev9r/dsh-kit#path:packages/dsh-whale-widget'),
      bundle('local-tool', '1.0.0', 'file:C:\\tmp\\local-tool'),
      bundle('@deepseek-ai/dsh-base', '0.2.1-rc.2', undefined, { official: true, availability: 'installation' }),
    ],
    respond: baselineRespond,
  })
  try {
    const result = await rpc(harness.routes, 'report', { force: true, wait: true })
    check(result.route.path === '/api/plugin-updates', 'the route is /api/plugin-updates')
    check(result.route.methods.join(',') === 'POST', 'the route accepts POST only')
    check(result.body.type === 'server-response' && result.body.rpcId === 'test-request', 'the route returns the Connection envelope')
    const report = result.value
    check(report.available === true && report.checking === false, 'the report is available and not checking')
    check(report.counts.thirdParty === 5 && report.counts.official === 1, 'the report counts third-party and official bundles')
    check(report.counts.updates === 3, 'two third-party updates plus the official line are counted')
    check(report.counts.unknown === 1, 'the local source is counted as unknown')

    const gotify = item(report, '@wha7ever/dsh-gotify-notify')
    check(gotify.status === 'current' && gotify.latest === '0.1.3', 'a current plugin reports its installed version')
    check(gotify.checkedFrom === 'npmmirror', 'a current plugin records the source that answered')

    const mcp = item(report, '@wha7ever/dsh-mcp-console')
    check(mcp.status === 'update' && mcp.latest === '0.1.1', 'a newer dist-tag is reported as an update')
    check(mcp.command === `dsh plugin --profile ${report.profile ?? '<profile>'} add "@wha7ever/dsh-mcp-console@0.1.1"`, 'the update command names the exact version')

    const whale = item(report, 'dsh-whale-widget')
    check(whale.status === 'update' && whale.checkedFrom === 'github-raw', 'a git source is read from raw.githubusercontent.com')
    check(whale.command?.includes('github:wha7ev9r/dsh-kit#path:packages/dsh-whale-widget') === true, 'a git update command reuses the recorded spec')

    const local = item(report, 'local-tool')
    check(local.status === 'unknown' && local.reason === 'local', 'a local path is reported as unknown')

    check(report.official?.runtime === '0.2.1-rc.2', 'the official runtime version comes from the official bundle')
    check(report.official?.latest === '0.2.1-rc.3' && report.official?.updateAvailable === true, 'the official line compares next with the running version')
    check(report.official?.bundleCount === 1, 'the official bundle count is reported')
    check(report.sources.includes('npmmirror') && report.sources.includes('github-raw'), 'the report names the sources that answered')
  } finally {
    harness.restore()
  }
}
//#endregion

//#region Startup timer
{
  const harness = mount({
    bundles: [bundle('@wha7ever/dsh-mcp-console', '0.1.0', '@wha7ever/dsh-mcp-console@0.1.0')],
    respond: baselineRespond,
    config: { startupDelayMs: 5 },
  })
  try {
    await new Promise((resolve) => setTimeout(resolve, 80))
    check(harness.calls.length > 0, 'the startup timer starts a background sweep without a browser request')
  } finally {
    harness.restore()
  }
}
//#endregion

//#region Change invalidation
{
  const harness = mount({
    bundles: [bundle('@wha7ever/dsh-mcp-console', '0.1.0', '@wha7ever/dsh-mcp-console@0.1.0')],
    respond: baselineRespond,
    config: { changeDebounceMs: 5 },
  })
  try {
    await rpc(harness.routes, 'report', { force: true, wait: true })
    harness.state.bundles = [
      ...harness.state.bundles,
      bundle('new-plugin', '1.0.0', 'new-plugin@latest'),
    ]
    harness.emit('plugin-manager/changed')
    const result = await rpc(harness.routes, 'report', { wait: true })
    check(item(result.value, 'new-plugin') !== undefined, 'a manager change invalidates the cache and picks up the new bundle')
  } finally {
    harness.restore()
  }
}
//#endregion

//#region Fallback and circuit breaker
{
  const calls = []
  const harness = mount({
    bundles: [
      bundle('@wha7ever/dsh-mcp-console', '0.1.0', '@wha7ever/dsh-mcp-console@0.1.0'),
      bundle('@deepseek-ai/dsh-base', '0.2.1-rc.2', undefined, { official: true, availability: 'installation' }),
    ],
    respond: (url) => {
      calls.push(url)
      if (url.includes('registry.npmmirror.com')) throw new TypeError('fetch failed')
      if (url.includes('registry.npmjs.org')) {
        if (url.includes('@wha7ever%2Fdsh-mcp-console/latest')) return json({ version: '0.1.1' })
        if (url.includes('@deepseek-ai%2Fdsh/next')) return json({ version: '0.2.1-rc.3' })
        if (url.includes('@deepseek-ai%2Fdsh/latest')) return json({ version: '0.2.0' })
        return json({ error: 'not found' }, 404)
      }
      return json({ error: 'not found' }, 404)
    },
  })
  try {
    const result = await rpc(harness.routes, 'report', { force: true, wait: true })
    const mcp = item(result.value, '@wha7ever/dsh-mcp-console')
    check(mcp.checkedFrom === 'npmjs' && mcp.status === 'update', 'a failed primary source falls through to npmjs')
    check(result.value.official?.checkedFrom === 'npmjs', 'the official line uses the same fallback')
    check(result.value.unavailableSources.includes('npmmirror'), 'two failures cool the primary source down')
    const npmmirrorCalls = calls.filter((url) => url.includes('registry.npmmirror.com')).length
    check(npmmirrorCalls <= 2, 'the cooled-down source is not asked for every later package')
  } finally {
    harness.restore()
  }
}
//#endregion

//#region Private registry
{
  const calls = []
  const harness = mount({
    bundles: [
      bundle('@wha7ever/dsh-mcp-console', '0.1.0', '@wha7ever/dsh-mcp-console@0.1.0'),
      bundle('@deepseek-ai/dsh-base', '0.2.1-rc.2', undefined, { official: true, availability: 'installation' }),
    ],
    registries: { registry: null, fallbackRegistries: [NPMMIRROR], resolved: 'https://npm.internal.example/' },
    respond: (url) => {
      calls.push(url)
      if (url.includes('npm.internal.example')) return json({ error: 'auth' }, 401)
      throw new Error(`unexpected public request: ${url}`)
    },
  })
  try {
    const result = await rpc(harness.routes, 'report', { force: true, wait: true })
    const mcp = item(result.value, '@wha7ever/dsh-mcp-console')
    check(mcp.status === 'unknown' && mcp.reason === 'private', 'a private registry is reported instead of falling through')
    check(result.value.official?.error === 'private', 'the official line respects the private registry')
    check(calls.every((url) => url.includes('npm.internal.example')), 'a private plan never asks a public source')
  } finally {
    harness.restore()
  }
}
//#endregion

//#region Stale report on a failed refresh
{
  const harness = mount({
    bundles: [bundle('@wha7ever/dsh-mcp-console', '0.1.0', '@wha7ever/dsh-mcp-console@0.1.0')],
    respond: baselineRespond,
    config: { changeDebounceMs: 5 },
  })
  try {
    const first = await rpc(harness.routes, 'report', { force: true, wait: true })
    check(first.value.items.length === 1, 'the first sweep succeeds')
    harness.state.bundleError = true
    harness.emit('plugin-manager/changed')
    const second = await rpc(harness.routes, 'report', { wait: true })
    check(typeof second.value.error === 'string' && second.value.error.includes('profile unavailable'), 'a failed refresh reports the failure')
    check(second.value.stale === true, 'a failed refresh marks the report stale')
    check(second.value.items.length === 1, 'a failed refresh keeps the last successful items')
  } finally {
    harness.restore()
  }
}
//#endregion

//#region Route errors
{
  const harness = mount({
    bundles: [],
    respond: baselineRespond,
  })
  try {
    const result = await rpc(harness.routes, 'unknown-endpoint')
    check(result.body.result?.ok === false, 'an unknown endpoint is refused')
    const response = await harness.routes.at(-1).fetch(new Request('http://127.0.0.1/api/plugin-updates', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-json',
    }))
    check(response.status === 400, 'a non-JSON body is refused with HTTP 400')
  } finally {
    harness.restore()
  }
}
//#endregion

if (failures.length) {
  console.error(`host.test: ${failures.length} failure(s)`)
  process.exitCode = 1
} else {
  console.log('host.test: passed')
}
