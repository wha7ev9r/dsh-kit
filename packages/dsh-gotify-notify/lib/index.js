/**
 * Host half of the Gotify notification bundle.
 *
 * The package owns one Loader row (`gotify-notify`) whose entire Config is
 * `.volatile()`, so the browser settings page edits it live through
 * `@deepseek-ai/dsh-settings` and the profile patch, with no plugin restart.
 *
 * Notifications are pushed with a plain `fetch`. The harness installs its
 * outbound proxy policy on the global dispatcher before any plugin loads, so
 * this call is routed (or bypassed for loopback) exactly like every other
 * harness request and needs no transport of its own.
 *
 * @module @wha7ever/dsh-gotify-notify
 */
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

//#region Constants
/** Package name, used for diagnostics and effect labels. */
const PACKAGE_NAME = '@wha7ever/dsh-gotify-notify'
/** Exact authenticated route the browser half calls. */
const ROUTE = '/api/gotify-notify'
/** Outbound budget for one Gotify push. */
const REQUEST_TIMEOUT_MS = 15000
/**
 * How long a root agent must stay idle before a completion push is sent.
 * An armed goal resumes its next round immediately, so this window keeps
 * automatic continuation from pinging the phone once per round.
 */
const COMPLETION_SETTLE_MS = 1500
/** Smallest gap between two byte-identical pushes. */
const DUPLICATE_WINDOW_MS = 3000
/** Gotify's documented priority ceiling. */
const MAX_PRIORITY = 10
/** Fallback title prefix when the configured one is blank. */
const DEFAULT_TITLE_PREFIX = 'DeepSeek Harness'
/** Owner entry id; also the settings namespace the browser page edits. */
const ENTRY_ID = 'gotify-notify'
/** Questions and options printed before a message is truncated. */
const MAX_QUESTIONS_SHOWN = 3
const MAX_OPTIONS_SHOWN = 6
/** Gotify accepts long bodies, but a phone notification should stay readable. */
const MAX_MESSAGE_CHARS = 3500
//#endregion

//#region Schema library
/**
 * Resolve the harness-provided Schemastery peer.
 *
 * A published install resolves the peer from the profile's flat `node_modules`.
 * A development install that symlinks this package out of a repository does
 * not, so the profile and harness-home roots are tried as well. Returning
 * `undefined` degrades only the settings surface: pushes keep working.
 *
 * @returns The Schemastery namespace, or `undefined` when no harness is reachable.
 */
async function resolveSchemaLibrary() {
  const attempts = []
  // Ask the harness loader first. It resolves a bare specifier for a
  // profile-installed plugin exactly as it does for every shipped package, which
  // is the only route that also works inside Electron, where `import.meta.url`
  // is not necessarily a plain `file:` URL.
  try {
    const loaded = await import('@deepseek-ai/schemastery')
    const candidate = loaded?.default ?? loaded
    if (candidate !== undefined && candidate !== null) {
      attempts.push({ anchor: 'import', ok: true })
      return { library: candidate, attempts }
    }
    attempts.push({ anchor: 'import', ok: false, error: 'empty namespace' })
  } catch (error) {
    attempts.push({ anchor: 'import', ok: false, error: error?.code ?? String(error?.message ?? error) })
  }
  const anchors = [['module', import.meta.url]]
  for (const [label, dir] of [['profile', process.env.DSH_PROFILE_DIR], ['home', process.env.DSH_HOME]]) {
    if (typeof dir === 'string' && dir.length > 0) {
      try {
        anchors.push([label, pathToFileURL(join(dir, 'package.json')).href])
      } catch {
        attempts.push({ anchor: label, ok: false, error: 'invalid path' })
      }
    }
  }
  for (const [label, anchor] of anchors) {
    try {
      const loaded = createRequire(anchor)('@deepseek-ai/schemastery')
      if (loaded !== undefined && loaded !== null) {
        attempts.push({ anchor: label, ok: true })
        return { library: loaded, attempts }
      }
      attempts.push({ anchor: label, ok: false, error: 'empty export' })
    } catch (error) {
      attempts.push({ anchor: label, ok: false, error: error?.code ?? String(error?.message ?? error) })
    }
  }
  return { library: undefined, attempts }
}

const resolvedSchema = await resolveSchemaLibrary()
const z = resolvedSchema.library
/** Why the settings schema is missing, for the status report. */
const schemaDiagnostics = { moduleUrl: import.meta.url, attempts: resolvedSchema.attempts }
//#endregion

//#region Config
/**
 * Fields the settings page edits live.
 *
 * Every field is `.volatile()`: `@deepseek-ai/dsh-settings` exposes exactly the
 * fields under a volatile node, and `apply` reads each one through `.get()` at
 * push time, so an edit reaches the next notification without a reload.
 */
const Config = z === undefined ? undefined : z.object({
  enabled: z.boolean().default(true).volatile(),
  serverUrl: z.string().default('').volatile(),
  appToken: z.string().role('secret').volatile(),
  priority: z.number().step(1).min(0).max(MAX_PRIORITY).default(8).volatile(),
  titlePrefix: z.string().default(DEFAULT_TITLE_PREFIX).volatile(),
  onQuestion: z.boolean().default(true).volatile(),
  onTurnEnd: z.boolean().default(true).volatile(),
  onApproval: z.boolean().default(true).volatile(),
  onError: z.boolean().default(false).volatile(),
  mentionSession: z.boolean().default(true).volatile(),
})
//#endregion

//#region Reads
/**
 * Read one Config field.
 *
 * A volatile field is a live reference read through `.get()`; a plain value
 * (which is what Cordis passes when the schema library is unavailable) is used
 * as it stands.
 *
 * @param field - the Config entry to read.
 * @param fallback - the value to use when the entry carries none.
 * @returns the effective value.
 */
function readField(field, fallback) {
  if (field === undefined || field === null) return fallback
  if (typeof field.get === 'function') {
    const value = field.get()
    return value === undefined || value === null ? fallback : value
  }
  return field
}

/** @param value - candidate text. @returns the value as a string, never `undefined`. */
function text(value) {
  return typeof value === 'string' ? value : ''
}

/**
 * Resolve the message endpoint for one server URL.
 *
 * `new URL` is used rather than string concatenation so a server mounted under
 * a path prefix (`https://host/gotify`) keeps that prefix.
 *
 * @param serverUrl - the configured base URL.
 * @returns the absolute message endpoint, or `undefined` when the URL is unusable.
 */
function messageEndpoint(serverUrl) {
  const trimmed = serverUrl.trim()
  if (trimmed === '') return undefined
  try {
    const base = trimmed.endsWith('/') ? trimmed : `${trimmed}/`
    return new URL('message', base).href
  } catch {
    return undefined
  }
}

/**
 * The page this harness is served from, used as the notification click target.
 *
 * @returns an absolute URL, or `undefined` when the launch recorded none.
 */
function harnessUrl() {
  const url = process.env.DSH_WEB_URL
  return typeof url === 'string' && url.length > 0 ? url : undefined
}

/**
 * Snapshot the live configuration.
 * @param config - the plugin's resolved Config.
 * @returns the effective settings with defaults applied.
 */
function effectiveSettings(config) {
  const source = config === undefined || config === null ? {} : config
  const priority = Number(readField(source.priority, 8))
  return {
    enabled: readField(source.enabled, true) !== false,
    serverUrl: text(readField(source.serverUrl, '')),
    appToken: text(readField(source.appToken, '')),
    priority: Number.isFinite(priority) ? Math.min(MAX_PRIORITY, Math.max(0, Math.trunc(priority))) : 8,
    titlePrefix: text(readField(source.titlePrefix, '')).trim() || DEFAULT_TITLE_PREFIX,
    onQuestion: readField(source.onQuestion, true) !== false,
    onTurnEnd: readField(source.onTurnEnd, true) !== false,
    onApproval: readField(source.onApproval, true) !== false,
    onError: readField(source.onError, false) === true,
    mentionSession: readField(source.mentionSession, true) !== false,
  }
}
//#endregion

//#region Message composition
/** @param value - any thrown or reported value. @returns readable single-line text. */
function describeFailure(value) {
  if (value instanceof Error) return value.message
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

/** @param sid - a session id. @returns its short form for a notification. */
function shortSession(sid) {
  return typeof sid === 'string' && sid.length > 0 ? sid.slice(-8) : ''
}

/**
 * Render the question event as notification lines.
 * @param request - the pending user-question request.
 * @returns the message body.
 */
function questionBody(request) {
  const lines = []
  const questions = Array.isArray(request?.questions) ? request.questions : []
  for (const item of questions.slice(0, MAX_QUESTIONS_SHOWN)) {
    const header = text(item?.header).trim()
    const question = text(item?.question).trim()
    lines.push(`• ${header === '' ? question : `${header}：${question}`}`)
    const options = Array.isArray(item?.options) ? item.options : []
    const labels = options.slice(0, MAX_OPTIONS_SHOWN).map((option) => text(option?.label).trim()).filter((label) => label !== '')
    if (labels.length > 0) lines.push(`   ${labels.join(' / ')}`)
  }
  if (questions.length > MAX_QUESTIONS_SHOWN) lines.push(`… 另有 ${questions.length - MAX_QUESTIONS_SHOWN} 个问题`)
  if (lines.length === 0) lines.push('Harness 有一个问题需要你确认。')
  return lines.join('\n')
}

/** @param error - the agent's failure. @returns the message body. */
function errorBody(error) {
  return `本轮执行出错，需要你查看：\n${describeFailure(error)}`
}
//#endregion

//#region Gateway
/**
 * Serialize and de-duplicate Gotify pushes.
 *
 * Sends are chained so a burst cannot open unbounded sockets, and a push whose
 * title and body repeat within {@link DUPLICATE_WINDOW_MS} is dropped.
 *
 * @param ctx - the plugin context, used for logging.
 * @param config - the live Config.
 * @returns the gateway handle.
 */
function createGateway(ctx, config) {
  const diagnostics = { lastError: undefined, lastSentAt: undefined, sent: 0 }
  let chain = Promise.resolve()
  let previousKey = ''
  let previousAt = 0

  const log = (level, message) => {
    try {
      ctx.logger[level]('%s', message)
    } catch {
      // Logging must never break a notification path.
    }
  }

  /**
   * Push one message.
   *
   * @param title - the notification title.
   * @param message - the notification body.
   * @returns the delivery outcome.
   */
  async function deliver(title, message) {
    const settings = effectiveSettings(config)
    if (!settings.enabled) return { delivered: false, detail: 'notifications are disabled' }
    const endpoint = messageEndpoint(settings.serverUrl)
    if (endpoint === undefined) return { delivered: false, detail: 'the server URL is not a valid absolute URL' }
    if (settings.appToken === '') return { delivered: false, detail: 'no application token is configured' }

    const body = {
      title,
      message: message.slice(0, MAX_MESSAGE_CHARS),
      priority: settings.priority,
      extras: { 'client::display': { contentType: 'text/plain' } },
    }
    const click = harnessUrl()
    if (click !== undefined) body.extras['client::notification'] = { click: { url: click } }

    let response
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Gotify-Key': settings.appToken },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    } catch (error) {
      const detail = describeFailure(error)
      diagnostics.lastError = detail
      log('warn', `${PACKAGE_NAME}: push to ${endpoint} failed: ${detail}`)
      return { delivered: false, detail }
    }

    if (!response.ok) {
      const detail = `HTTP ${response.status} ${await safeText(response)}`.trim()
      diagnostics.lastError = detail
      log('warn', `${PACKAGE_NAME}: Gotify rejected the message: ${detail}`)
      return { delivered: false, detail }
    }

    diagnostics.lastError = undefined
    diagnostics.lastSentAt = Date.now()
    diagnostics.sent += 1
    return { delivered: true, detail: `HTTP ${response.status}` }
  }

  return {
    diagnostics,
    /**
     * Queue one notification.
     *
     * @param title - the notification title.
     * @param message - the notification body.
     * @returns settlement after the queued attempt.
     */
    notify(title, message) {
      const key = `${title}\u0000${message}`
      const now = Date.now()
      if (key === previousKey && now - previousAt < DUPLICATE_WINDOW_MS) return Promise.resolve({ delivered: false, detail: 'duplicate' })
      previousKey = key
      previousAt = now
      chain = chain.then(() => deliver(title, message), () => deliver(title, message))
      return chain
    },
    /** Wait for every queued push. @returns settlement. */
    settle() {
      return chain
    },
  }
}

/**
 * Read a response body without letting a transport fault mask the status.
 * @param response - the failed response.
 * @returns the body text or an empty string.
 */
async function safeText(response) {
  try {
    const body = await response.text()
    return body.length > 200 ? `${body.slice(0, 200)}…` : body
  } catch {
    return ''
  }
}
//#endregion

//#region Plugin
/** Cordis plugin name used by loader diagnostics. */
export const name = ENTRY_ID
export { Config }

/**
 * Mount the notification hooks and the settings RPC route.
 *
 * @param ctx - the plugin context.
 * @param config - the resolved Config; every field is a live reference.
 */
export function apply(ctx, config) {
  const gateway = createGateway(ctx, config)
  const goals = ctx.get('goals')
  const agents = ctx.get('agents')

  if (z === undefined) {
    try {
      ctx.logger.warn('%s', `${PACKAGE_NAME}: @deepseek-ai/schemastery is not resolvable, so the settings page cannot configure this plugin`)
    } catch {
      // Diagnostics only.
    }
  }

  // This bundle ships its own settings page, so the schema-derived automatic
  // page is unnecessary. `auto` still defaults to true when a page is absent.
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.effect(
      () => settingsCtx.settings.configure({ auto: false }, ctx.fiber),
      `${PACKAGE_NAME}: own settings page`,
    )
  })

  /** @param agent - the agent an event names. @returns whether it is a root, user-facing agent. */
  const isRootAgent = (agent) => {
    if (agent === undefined || agents === undefined) return true
    try {
      return agents.roots().some((candidate) => candidate.id === agent.id)
    } catch {
      return true
    }
  }

  /** @param agent - the agent whose goal is read. @returns the goal view, or `undefined`. */
  const goalOf = (agent) => {
    if (agent === undefined || goals === undefined) return undefined
    try {
      return goals.get(agent)
    } catch {
      return undefined
    }
  }

  /** @param agent - the idle agent. @param settings - the live settings. @returns the completion body. */
  const completionBody = (agent, settings) => {
    const lines = []
    const goal = goalOf(agent)
    if (goal !== undefined) {
      const phase = goal.phase === 'complete'
        ? '已完成'
        : goal.phase === 'blocked'
          ? `被阻断${text(goal.blockedReason?.code) === '' ? '' : `（${goal.blockedReason.code}）`}`
          : goal.phase === 'paused'
            ? '已暂停'
            : '已停止'
      lines.push(`目标${phase}，共 ${goal.roundsStarted}/${goal.maxGoalRounds} 轮`)
      const objective = text(goal.objective).trim()
      if (objective !== '') lines.push(objective)
    } else {
      lines.push('本轮任务已结束，Harness 正在等待你的下一步输入。')
    }
    if (settings.mentionSession) {
      const sid = shortSession(agent?.id)
      if (sid !== '') lines.push(`会话 ${sid}`)
    }
    return lines.join('\n')
  }

  /**
   * Whether the harness will resume this session by itself.
   *
   * `dsh-goal-round-driver` queues its next round whenever an exact live agent
   * is idle, its goal is `active` and continuation is `armed`, and round
   * capacity remains — so an idle agent in that state is not waiting for the
   * human and must not raise a completion alert. Every way the driver stops
   * leaves the goal observable: `complete` and `blocked` (the round cap records
   * a `round-limit` blocker), a pause, or a disarmed continuation after a
   * resume. Each of those sends the alert.
   *
   * @param agent - the idle agent.
   * @returns whether automatic continuation owns the session.
   */
  const continuesAutomatically = (agent) => {
    const goal = goalOf(agent)
    return goal !== undefined && goal.phase === 'active' && goal.activation === 'armed'
  }

  //#region Completions
  /** Pending completion pushes, keyed by session id. */
  const pending = new Map()

  /** @param agent - the session whose pending push is dropped. */
  const cancelPending = (agent) => {
    const handle = pending.get(agent.id)
    if (handle === undefined) return
    clearTimeout(handle)
    pending.delete(agent.id)
  }

  ctx.effect(() => () => {
    for (const handle of pending.values()) clearTimeout(handle)
    pending.clear()
  }, `${PACKAGE_NAME}: pending completions`)

  const running = new Set()
  ctx.on('agent/status', (payload) => {
    const agent = payload?.agent
    if (agent === undefined) return
    if (payload.status === 'running') {
      running.add(agent.id)
      cancelPending(agent)
      return
    }
    if (payload.status !== 'idle' || !running.delete(agent.id)) return
    if (!isRootAgent(agent)) return
    cancelPending(agent)
    if (continuesAutomatically(agent)) return
    const handle = setTimeout(() => {
      pending.delete(agent.id)
      const settings = effectiveSettings(config)
      if (!settings.enabled || !settings.onTurnEnd) return
      // Re-read: a goal may have been created or resumed inside the window.
      if (continuesAutomatically(agent)) return
      void gateway.notify(`${settings.titlePrefix} · 任务完成`, completionBody(agent, settings))
    }, COMPLETION_SETTLE_MS)
    pending.set(agent.id, handle)
  }, { global: true })
  //#endregion

  // A question always needs the human. This listener only observes: it runs
  // ahead of every answerer (`prepend`) and immediately calls `next()`, so the
  // shipped answerer still owns the decision. Without `prepend` an answerer
  // registered earlier would claim the request first and this listener — sitting
  // further inside the waterfall — would never run at all.
  ctx.on('user-questions/request', (request, next) => {
    const settings = effectiveSettings(config)
    if (settings.enabled && settings.onQuestion) {
      const sid = settings.mentionSession ? shortSession(request?.agent?.id) : ''
      const body = sid === '' ? questionBody(request) : `${questionBody(request)}\n会话 ${sid}`
      void gateway.notify(`${settings.titlePrefix} · 需要你回答`, body)
    }
    return next()
  }, { prepend: true, global: true })

  ctx.on('approval/request', (request, next) => {
    const settings = effectiveSettings(config)
    if (settings.enabled && settings.onApproval) {
      const reason = text(request?.displayReason?.zh ?? request?.displayReason?.en ?? request?.reason).trim()
      const lines = [`工具「${text(request?.toolName) || '未知'}」正在等待你的批准。`]
      if (reason !== '') lines.push(reason)
      void gateway.notify(`${settings.titlePrefix} · 需要你批准`, lines.join('\n'))
    }
    return next()
  }, { prepend: true, global: true })

  ctx.on('agent/error', (payload) => {
    const settings = effectiveSettings(config)
    if (!settings.enabled || !settings.onError) return
    if (!isRootAgent(payload?.agent)) return
    void gateway.notify(`${settings.titlePrefix} · 执行出错`, errorBody(payload?.error))
  }, { global: true })

  //#region RPC
  // Connection's shared `/api` handler applies its Host/Origin and browser
  // authentication policy before an exact fetch route is dispatched, so the
  // page uses the authenticated channel rather than a second HTTP server.
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
          if (call.endpoint === 'test') {
            const settings = effectiveSettings(config)
            const outcome = await gateway.notify(`${settings.titlePrefix} · 测试通知`, '如果你看到这条消息，Gotify 提醒已经配置成功。')
            return envelope(rpcId, { ok: true, value: outcome })
          }
          if (call.endpoint === 'status') {
            return envelope(rpcId, { ok: true, value: statusOf(ctx, config, gateway) })
          }
          return envelope(rpcId, fail(`unknown endpoint: ${String(call.endpoint)}`))
        } catch (error) {
          return envelope(rpcId, fail(error?.message ? error.message : String(error)))
        }
      },
    }), `${PACKAGE_NAME}: ${ROUTE}`)
  })
  //#endregion
}

/**
 * Report what the settings page needs to explain its own state.
 *
 * @param ctx - the plugin context.
 * @param config - the live Config.
 * @param gateway - the push gateway, read for its last failure.
 * @returns the diagnostics the page renders.
 */
function statusOf(ctx, config, gateway) {
  const settings = effectiveSettings(config)
  const editor = ctx.get('configEditor')
  let configurable = false
  try {
    configurable = editor !== undefined && editor.entries().some((entry) => entry.options.id === ENTRY_ID)
  } catch {
    configurable = false
  }
  return {
    schemaAvailable: z !== undefined,
    schemaDiagnostics,
    configurable,
    enabled: settings.enabled,
    configured: messageEndpoint(settings.serverUrl) !== undefined && settings.appToken !== '',
    serverUrl: settings.serverUrl,
    tokenSet: settings.appToken !== '',
    lastError: gateway.diagnostics.lastError ?? null,
    sent: gateway.diagnostics.sent,
  }
}

/** @param message - the failure text. @returns the RPC failure result. */
function fail(message) {
  return { ok: false, error: { code: 'internal', message, details: {} } }
}

/** @param rpcId - the caller's request id. @param result - the RPC result. @returns the wire response. */
function envelope(rpcId, result) {
  return Response.json({ type: 'server-response', rpcId, result })
}
//#endregion
