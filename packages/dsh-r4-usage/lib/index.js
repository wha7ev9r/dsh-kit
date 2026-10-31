/**
 * Host half of the r4 usage dashboard bundle.
 *
 * The browser half never calls the r4 API directly: those endpoints sit behind
 * the same API key as inference, so a browser request would put the key in page
 * memory and add a CORS preflight. This half resolves the key from the harness
 * credential store on every read, calls the documented `/v1/cli/*` endpoints
 * over the harness outbound dispatcher, and answers the browser on its
 * authenticated `/api` connection channel.
 *
 * The package declares no `engines` and no `peerDependencies` on purpose: no
 * version range can refuse to load it on a future harness. When a contract this
 * half relies on changes, the failure surfaces as an error in the panel instead
 * of a rejected install.
 *
 * @module @wha7ever/dsh-r4-usage
 */

/** Package name, used for effect labels and diagnostics. */
const PACKAGE_NAME = '@wha7ever/dsh-r4-usage'
/** Exact authenticated route the browser half calls. */
const ROUTE = '/api/r4-usage'
/** Documented default host for the r4 CLI endpoints. */
const DEFAULT_BASE_URL = 'https://api.r4.codes'
/** Credential reference read when the row names none. */
const DEFAULT_KEY_ENV = 'R4_API_KEY'
/** IANA time zone deciding the local days of `today` and `series`. */
const DEFAULT_TIMEZONE = 'Asia/Shanghai'
/** Slowest poll the dashboard itself asks for. */
const DEFAULT_REFRESH_MS = 60000
/** Floor for a configured poll; the endpoint allows 60 reads per minute. */
const MIN_REFRESH_MS = 15000
/** Shortest host cache life; protects the shared 60/minute bucket. */
const MIN_CACHE_MS = 30000
/** A forced refresh inside this window is answered from the cache. */
const MIN_FORCE_GAP_MS = 5000
/** Outbound budget for one endpoint read. */
const REQUEST_TIMEOUT_MS = 10000
/** Milliseconds in one local calendar day. */
const DAY_MS = 86400000
/** Shortest accepted API key; the Host is the single source of this bound. */
const MIN_KEY_LENGTH = 8

/** Hard dependency: without the credential service no key can be resolved. */
export const inject = ['credentials']

//#region Normalization

/** Parse a documented decimal-string or number into a number, or null. */
function toNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** Parse a documented count; an absent window means zero. */
function toCount(value) {
  const parsed = toNumber(value)
  return parsed === null ? 0 : parsed
}

/** Normalize one usage window (`today` or a `series` bucket). */
function normalizeWindow(source) {
  const input = source && typeof source === 'object' ? source : {}
  return {
    requests: toCount(input.request_count),
    chargedUsd: toCount(input.charged_usd_total),
    promptTokens: toCount(input.prompt_tokens_total),
    completionTokens: toCount(input.completion_tokens_total),
    cacheReadTokens: toCount(input.cache_read_tokens_total),
    cacheCreationTokens: toCount(input.cache_creation_tokens_total),
  }
}

/** Parse a `YYYY-MM-DD` label into a UTC midnight timestamp. */
function parseLocalDay(day) {
  const match = typeof day === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(day) : null
  if (!match) return null
  const time = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isFinite(time) ? time : null
}

/** Format a UTC midnight timestamp back into the API's day label. */
function formatDay(time) {
  const date = new Date(time)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

/**
 * Normalize the local-day series and guarantee its seven-bucket shape.
 *
 * The endpoint zero-fills the window it returns, but an older response, a proxy
 * error, or a missing array must not shrink the chart: the window is padded
 * backwards from its last day (or from the response's `day`), so the card always
 * draws seven days and the oldest label stays true.
 */
export function normalizeSeries(list, anchorDay) {
  const entries = Array.isArray(list)
    ? list
        .map((entry) => {
          const input = entry && typeof entry === 'object' ? entry : {}
          return {
            day: typeof input.bucket === 'string' ? input.bucket : '',
            requests: toCount(input.request_count),
            chargedUsd: toCount(input.charged_usd_total),
          }
        })
        .filter((entry) => entry.day)
    : []
  const trimmed = entries.slice(-7)
  const anchor = trimmed.length ? trimmed[trimmed.length - 1].day : anchorDay
  const anchorTime = parseLocalDay(anchor)
  if (anchorTime === null) return trimmed
  // An empty response still anchors on `day`: that day is the newest bucket, so
  // the chart ends today instead of yesterday.
  const buckets = trimmed.length ? trimmed : [{ day: anchor, requests: 0, chargedUsd: 0 }]
  const missing = 7 - buckets.length
  const padding = []
  for (let offset = missing; offset > 0; offset -= 1) {
    padding.push({ day: formatDay(anchorTime - offset * DAY_MS), requests: 0, chargedUsd: 0 })
  }
  return [...padding, ...buckets]
}

/** Normalize the `key` envelope shared by `/v1/cli/key` and `/v1/cli/meta`. */
export function normalizeIdentity(payload) {
  const key = payload && typeof payload === 'object' && payload.key && typeof payload.key === 'object' ? payload.key : undefined
  return {
    name: typeof key?.name === 'string' && key.name ? key.name : null,
    start: typeof key?.start === 'string' && key.start ? key.start : null,
  }
}

/** Normalize `/v1/cli/key`: counters, today, and the local-day series. */
export function normalizeKey(payload) {
  const input = payload && typeof payload === 'object' ? payload : {}
  const day = typeof input.day === 'string' ? input.day : null
  return {
    day,
    limitUsd: toNumber(input.limit_usd),
    spentUsd: toCount(input.spent_usd),
    heldUsd: toCount(input.held_usd),
    remainingUsd: toNumber(input.remaining_usd),
    today: normalizeWindow(input.today),
    series: normalizeSeries(input.series, day),
  }
}

/** Normalize `/v1/cli/usage`: the account day plus the per-model split. */
export function normalizeUsage(payload) {
  const input = payload && typeof payload === 'object' ? payload : {}
  const models = Array.isArray(input.models) ? input.models : []
  return {
    day: typeof input.day === 'string' ? input.day : null,
    models: models
      .map((entry) => {
        const model = entry && typeof entry === 'object' ? entry : {}
        const points = Array.isArray(model.points) ? model.points : []
        const slug = typeof model.model_slug === 'string' ? model.model_slug : ''
        return {
          slug,
          name: typeof model.model_display_name === 'string' && model.model_display_name ? model.model_display_name : slug,
          chargedUsd: points.reduce((sum, point) => sum + toCount(point?.charged_usd_total), 0),
          requests: points.reduce((sum, point) => sum + toCount(point?.request_count), 0),
        }
      })
      .filter((model) => model.chargedUsd > 0)
      .sort((left, right) => right.chargedUsd - left.chargedUsd),
  }
}

/** Normalize `/v1/cli/meta`: plan snapshot, spend windows, wallet, identity. */
export function normalizeMeta(payload) {
  const input = payload && typeof payload === 'object' ? payload : {}
  const plan = input.plan && typeof input.plan === 'object' ? input.plan : null
  const wallet = input.wallet && typeof input.wallet === 'object' ? input.wallet : null
  return {
    identity: normalizeIdentity(input),
    plan: plan
      ? {
          name: typeof plan.package_name === 'string' ? plan.package_name : '',
          remainingUsd: toNumber(plan.remaining_usd),
          totalUsd: toNumber(plan.total_usd),
          expiresAt: typeof plan.expires_at === 'string' ? plan.expires_at : null,
          windows: (Array.isArray(plan.limit_windows) ? plan.limit_windows : []).map((entry) => {
            const window = entry && typeof entry === 'object' ? entry : {}
            return {
              seconds: toCount(window.duration_seconds),
              ceilingUsd: toNumber(window.ceiling_usd),
              consumedUsd: toCount(window.consumed_usd),
              remainingUsd: toNumber(window.remaining_usd),
              resetsAt: typeof window.resets_at === 'string' ? window.resets_at : null,
            }
          }),
        }
      : null,
    wallet: wallet
      ? {
          balanceUsd: toNumber(wallet.balance_usd),
          maxConcurrency: toCount(wallet.max_concurrency),
        }
      : null,
  }
}

/**
 * Map one HTTP failure to a stable code the browser localizes.
 *
 * The documented error bodies carry `error.code`; the status check stays as the
 * fallback for a proxy or gateway that answers before the API does.
 */
export function describeFailure(status, body) {
  const code = body && typeof body === 'object' && body.error && typeof body.error.code === 'string' ? body.error.code : null
  const message = body && typeof body === 'object' && body.error && typeof body.error.message === 'string' ? body.error.message : ''
  if (code === 'STANDARD_KEY_REQUIRED') return { code: 'monitor-key', status, message }
  if (code === 'CLI_RATE_LIMITED' || status === 429) return { code: 'rate-limited', status, message }
  if (code === 'INVALID_TIME_ZONE') return { code: 'bad-timezone', status, message }
  if (status === 401 || status === 403 || code === 'INVALID_KEY' || code === 'KEY_NOT_FOUND') return { code: 'unauthorized', status, message }
  return { code: 'http', status, message }
}

/** Map a transport failure (offline, DNS, timeout) to a stable code. */
export function describeTransportError(error) {
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') return { code: 'timeout', status: null, message: '' }
  return { code: 'network', status: null, message: error?.message ? String(error.message) : '' }
}

//#endregion

//#region Configuration and transport

/** Merge the row config over the documented defaults. */
export function normalizeConfig(raw) {
  const input = raw && typeof raw === 'object' ? raw : {}
  const configuredBase = typeof input.baseUrl === 'string' ? input.baseUrl.trim() : ''
  const configuredKeyEnv = typeof input.apiKeyEnv === 'string' ? input.apiKeyEnv.trim() : ''
  const configuredTimezone = typeof input.timezone === 'string' ? input.timezone.trim() : ''
  const configuredRefresh = Number(input.refreshMs)
  return {
    baseUrl: (configuredBase || DEFAULT_BASE_URL).replace(/\/+$/, ''),
    apiKeyEnv: configuredKeyEnv || DEFAULT_KEY_ENV,
    timezone: configuredTimezone || DEFAULT_TIMEZONE,
    refreshMs: Number.isFinite(configuredRefresh)
      ? Math.max(MIN_REFRESH_MS, Math.floor(configuredRefresh))
      : DEFAULT_REFRESH_MS,
  }
}

/** Read one JSON endpoint; every failure is a value, never a throw. */
async function requestJson(url, apiKey) {
  let response
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    return { ok: false, failure: describeTransportError(error) }
  }
  const text = await response.text().catch(() => '')
  let body
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = undefined
    }
  }
  if (!response.ok) return { ok: false, failure: describeFailure(response.status, body) }
  if (!body || typeof body !== 'object') return { ok: false, failure: { code: 'invalid-body', status: response.status, message: '' } }
  return { ok: true, body }
}

/**
 * Build the one snapshot the browser renders.
 *
 * `/v1/cli/key` is authoritative for a fatal answer; `usage` and `meta` are
 * optional enrichment, so their failures land in `partialErrors` while the rest
 * still renders. A failed refresh keeps the last good numbers and only swaps in
 * the error, which is what makes the pill keep showing a budget while offline.
 */
function createStore(options) {
  const { config, resolveCredential } = options
  const ttl = Math.max(MIN_CACHE_MS, Math.floor(config.refreshMs / 2))
  let cached = null
  let inflight = null
  let loadedAt = 0

  async function buildSnapshot() {
    const credential = await resolveCredential()
    const apiKey = typeof credential?.value === 'string' ? credential.value.trim() : ''
    const base = {
      configured: false,
      credentialSource: credential?.source ?? null,
      baseUrl: config.baseUrl,
      timezone: config.timezone,
      refreshMs: config.refreshMs,
      fetchedAt: Date.now(),
      identity: null,
      plan: null,
      wallet: null,
      keyLimit: null,
      today: null,
      series: [],
      models: [],
      partialErrors: [],
      error: null,
      day: null,
    }
    if (!apiKey) return base

    const endpoint = `${config.baseUrl}/v1/cli`
    const query = `?tz=${encodeURIComponent(config.timezone)}`
    const [keyResult, usageResult, metaResult] = await Promise.all([
      requestJson(`${endpoint}/key${query}`, apiKey),
      requestJson(`${endpoint}/usage${query}`, apiKey),
      requestJson(`${endpoint}/meta`, apiKey),
    ])

    if (!keyResult.ok) {
      const failure = keyResult.failure
      if (cached) {
        return { ...cached, credentialSource: credential?.source ?? cached.credentialSource, fetchedAt: Date.now(), error: failure }
      }
      return { ...base, configured: true, error: failure }
    }

    const normalizedKey = normalizeKey(keyResult.body)
    const normalizedUsage = usageResult.ok ? normalizeUsage(usageResult.body) : null
    const normalizedMeta = metaResult.ok ? normalizeMeta(metaResult.body) : null
    const identity = normalizedMeta?.identity?.name || normalizedMeta?.identity?.start ? normalizedMeta.identity : normalizeIdentity(keyResult.body)

    return {
      ...base,
      configured: true,
      identity,
      plan: normalizedMeta?.plan ?? null,
      wallet: normalizedMeta?.wallet ?? null,
      keyLimit: {
        limitUsd: normalizedKey.limitUsd,
        spentUsd: normalizedKey.spentUsd,
        heldUsd: normalizedKey.heldUsd,
        remainingUsd: normalizedKey.remainingUsd,
      },
      today: normalizedKey.today,
      series: normalizedKey.series,
      models: normalizedUsage?.models ?? [],
      day: normalizedKey.day ?? normalizedUsage?.day ?? null,
      partialErrors: [
        ...(usageResult.ok ? [] : [{ source: 'usage', ...usageResult.failure }]),
        ...(metaResult.ok ? [] : [{ source: 'meta', ...metaResult.failure }]),
      ],
      fetchedAt: Date.now(),
      error: null,
    }
  }

  async function read({ force = false } = {}) {
    const now = Date.now()
    if (!force && cached && now - cached.fetchedAt < ttl) return cached
    if (inflight) return inflight
    if (force && cached && now - loadedAt < MIN_FORCE_GAP_MS) return cached
    inflight = buildSnapshot()
      .then((value) => {
        cached = value
        loadedAt = Date.now()
        return value
      })
      .finally(() => {
        inflight = null
      })
    return inflight
  }

  return {
    read,
    reset() {
      cached = null
      loadedAt = 0
    },
  }
}

//#endregion

//#region RPC

/** One client-visible envelope on the shared authenticated channel. */
function envelope(rpcId, result) {
  return Response.json({ type: 'server-response', rpcId, result })
}

function fail(code, message) {
  return { ok: false, error: { code, message } }
}

/**
 * Host plugin entry: resolves credentials per read, caches one snapshot, and
 * owns the `/api/r4-usage` route and its two endpoints.
 */
export function apply(ctx, rawConfig) {
  const config = normalizeConfig(rawConfig)
  const store = createStore({
    config,
    resolveCredential: () => ctx.credentials.resolve(config.apiKeyEnv),
  })

  async function storeKey(value) {
    if (typeof value !== 'string' || value.trim().length < MIN_KEY_LENGTH) {
      return fail('invalid-key', `a key of at least ${MIN_KEY_LENGTH} characters is required`)
    }
    let info
    try {
      info = await ctx.credentials.describe(config.apiKeyEnv)
    } catch {
      info = undefined
    }
    if (info && info.writable === false) {
      return fail('key-read-only', 'the credential store rejected this reference')
    }
    try {
      await ctx.credentials.set(config.apiKeyEnv, value.trim())
    } catch (error) {
      return fail('key-write-failed', error?.message ? String(error.message) : 'the credential write failed')
    }
    store.reset()
    return { ok: true }
  }

  async function handle(call) {
    const endpoint = call && typeof call === 'object' ? call.endpoint : undefined
    const payload = call && typeof call === 'object' && call.payload && typeof call.payload === 'object' ? call.payload : {}
    if (endpoint === 'snapshot') return { ok: true, value: await store.read({ force: payload.force === true }) }
    if (endpoint === 'setKey') {
      const result = await storeKey(payload.key)
      if (!result.ok) return result
      return { ok: true, value: await store.read({ force: true }) }
    }
    return fail('unknown-endpoint', `unknown endpoint: ${String(endpoint)}`)
  }

  // Connection's shared /api handler applies its Host/Origin and browser
  // authentication policy before dispatching an exact fetch route, so the
  // browser half talks to this route through the authenticated channel.
  ctx.inject(['connection'], (connectionCtx) => {
    connectionCtx.effect(
      () =>
        connectionCtx.connection.fetch.register({
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
            try {
              return envelope(rpcId, await handle(body?.payload ?? {}))
            } catch (error) {
              return envelope(rpcId, fail('internal', error?.message ? String(error.message) : String(error)))
            }
          },
        }),
      `${PACKAGE_NAME}: ${ROUTE}`,
    )
  })
}

//#endregion
