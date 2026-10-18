// Offline harness for the plugin's Host half.
//
// Imports the REAL lib/index.js, mounts it on a fake Cordis context with
// volatile-like Config fields, intercepts `fetch`, and drives the events the
// module subscribes to. Nothing here needs a running harness: the checks cover
// registration ordering, every trigger, the goal-continuation rule, credential
// handling, de-duplication, and the browser RPC surface.
import * as plugin from '../lib/index.js'

const failures = []
const check = (condition, message) => {
  if (!condition) failures.push(message)
  console.log(`${condition ? 'ok  ' : 'FAIL'}  ${message}`)
}

/** How long the completion push waits before it is allowed to fire. */
const SETTLE_WAIT_MS = 1800

/** Build a Config whose fields behave like `Volatile<T>` references. */
function volatileConfig(overrides = {}) {
  const base = {
    enabled: true,
    serverUrl: 'https://push.example.com',
    appToken: 'app-token',
    priority: 8,
    titlePrefix: 'DSH',
    onQuestion: true,
    onTurnEnd: true,
    onApproval: true,
    onError: false,
    mentionSession: true,
    ...overrides,
  }
  return Object.fromEntries(Object.entries(base).map(([key, value]) => [key, { get: () => value }]))
}

/** A Response the sender accepts. */
const okResponse = (status = 200) => ({ ok: true, status, text: async () => '' })

/**
 * Mount the Host half on a fake context.
 * @param options - config overrides, the live goal per agent id, root agent ids, and the fetch result.
 * @returns the mount's handles.
 */
function mount(options = {}) {
  const { config: overrides = {}, goals = new Map(), roots = [{ id: 'session-root' }], respond = okResponse } = options
  const listeners = new Map()
  const routes = []
  const calls = []
  const effects = []
  const logs = []

  const previousFetch = globalThis.fetch
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init, body: JSON.parse(init.body), headers: init.headers })
    return respond(calls.length)
  }

  const register = (name, callback, flags) => {
    const list = listeners.get(name) ?? []
    list.push({ callback, flags })
    listeners.set(name, list)
  }

  const subContext = {
    effect: (fn) => {
      effects.push(fn())
      return () => {}
    },
    settings: { configure: () => () => {} },
    connection: { fetch: { register: (route) => { routes.push(route); return () => {} } } },
  }

  const ctx = {
    on: register,
    effect: (fn) => {
      effects.push(fn())
      return () => {}
    },
    get: (name) => {
      if (name === 'goals') return { get: (agent) => goals.get(agent.id) }
      if (name === 'agents') return { roots: () => roots }
      if (name === 'configEditor') return { entries: () => options.configurableEntries ?? [{ options: { id: 'gotify-notify' } }] }
      return undefined
    },
    inject: (_names, callback) => {
      callback(subContext)
      return () => {}
    },
    logger: {
      warn: (...args) => logs.push(['warn', args.join(' ')]),
      info: (...args) => logs.push(['info', args.join(' ')]),
      error: (...args) => logs.push(['error', args.join(' ')]),
      debug: (...args) => logs.push(['debug', args.join(' ')]),
    },
    fiber: { uid: 1 },
  }

  plugin.apply(ctx, volatileConfig(overrides))

  /** Dispatch an emit-mode event to every listener in registration order. */
  const emit = (name, payload) => {
    for (const { callback } of listeners.get(name) ?? []) callback(payload)
  }

  /**
   * Dispatch a waterfall event exactly as Cordis does: prepended listeners run
   * first, each listener wraps the rest of the chain, and a listener that
   * returns without calling `next()` vetoes it.
   */
  const waterfall = (name, request, builtin = async () => ({ answers: [] })) => {
    const hooks = listeners.get(name) ?? []
    const ordered = [...hooks.filter((hook) => hook.flags?.prepend === true), ...hooks.filter((hook) => hook.flags?.prepend !== true)]
    const chain = [...ordered]
    const next = () => (chain.shift()?.callback ?? builtin)(request, next)
    return next()
  }

  /** Call one browser RPC endpoint through the registered route. */
  const rpc = async (endpoint) => {
    const route = routes.at(-1)
    const request = new Request('http://127.0.0.1/api/gotify-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rpcId: 'test-req', payload: { endpoint } }),
    })
    const response = await route.fetch(request)
    return { path: route.path, methods: route.methods, body: await response.json() }
  }

  return {
    calls,
    effects,
    logs,
    listeners,
    routes,
    emit,
    waterfall,
    rpc,
    restore: () => { globalThis.fetch = previousFetch },
  }
}

/** One question request shaped like the harness's own event payload. */
const questionRequest = (agent = { id: 'session-root' }) => ({
  agent,
  questions: [
    { id: 'q1', header: '部署', question: '要部署到生产吗？', options: [{ label: '是' }, { label: '否' }] },
    { id: 'q2', question: '要同时备份吗？' },
  ],
})

//#region Registration
{
  const harness = mount()
  const questionHooks = harness.listeners.get('user-questions/request') ?? []
  const approvalHooks = harness.listeners.get('approval/request') ?? []
  check(questionHooks.length === 1, 'subscribes once to user-questions/request')
  check(questionHooks[0].flags?.prepend === true, 'the question observer runs ahead of every answerer')
  check(questionHooks[0].flags?.global === true, 'the question observer bypasses scope filtering')
  check(approvalHooks[0]?.flags?.prepend === true, 'the approval observer runs ahead of every answerer')
  check(approvalHooks[0]?.flags?.global === true, 'the approval observer bypasses scope filtering')
  check((harness.listeners.get('agent/status') ?? []).length === 1, 'subscribes once to agent/status')
  check((harness.listeners.get('agent/error') ?? []).length === 1, 'subscribes once to agent/error')
  check(typeof plugin.Config !== 'undefined', 'the plugin declares a Config schema')
  check(harness.routes.length === 1 && harness.routes[0].path === '/api/gotify-notify', 'registers its own RPC route')
  harness.restore()
}
//#endregion

//#region Questions
{
  const harness = mount()
  let delegated = false
  const answer = await harness.waterfall('user-questions/request', questionRequest(), async () => {
    delegated = true
    return { answers: [{ id: 'q1', selected: ['是'] }] }
  })
  check(delegated, 'the question observer delegates instead of claiming')
  check(answer.answers[0].selected[0] === '是', 'the shipped answerer still decides')

  const call = harness.calls[0]
  check(harness.calls.length === 1, `one push per question request (${harness.calls.length})`)
  check(call.url === 'https://push.example.com/message', `posts to the configured endpoint (${call.url})`)
  check(call.init.method === 'POST', 'posts with POST')
  check(call.headers['X-Gotify-Key'] === 'app-token', 'the application credential rides the Gotify header')
  check(call.headers['Content-Type'] === 'application/json', 'the body is sent as JSON')
  check(call.body.title === 'DSH · 需要你回答', `the title carries the prefix and the trigger (${call.body.title})`)
  check(call.body.priority === 8, 'the configured priority is used')
  check(call.body.extras['client::display'].contentType === 'text/plain', 'the body is rendered as plain text')
  check(call.body.message.includes('部署：要部署到生产吗？'), 'the question header and text are included')
  check(call.body.message.includes('是 / 否'), 'the options are listed')
  check(call.body.message.includes('要同时备份吗？'), 'every question in the batch is included')
  check(call.body.message.includes('会话 session-root'.slice(-14)) || call.body.message.includes('n-root'), 'the session is appended when enabled')
  harness.restore()
}

{
  const harness = mount({ config: { mentionSession: false } })
  await harness.waterfall('user-questions/request', questionRequest(), async () => ({}))
  check(!harness.calls[0].body.message.includes('会话'), 'the session id is omitted when the option is off')
  harness.restore()
}

{
  const harness = mount({ config: { onQuestion: false } })
  await harness.waterfall('user-questions/request', questionRequest(), async () => ({}))
  check(harness.calls.length === 0, 'the question trigger can be switched off')
  harness.restore()
}

{
  const harness = mount({ config: { enabled: false } })
  await harness.waterfall('user-questions/request', questionRequest(), async () => ({}))
  check(harness.calls.length === 0, 'the master switch suppresses every push')
  harness.restore()
}
//#endregion

//#region Configuration edges
{
  const harness = mount({ config: { serverUrl: 'https://example.com/gotify' } })
  await harness.waterfall('user-questions/request', questionRequest(), async () => ({}))
  check(harness.calls[0].url === 'https://example.com/gotify/message', `a path prefix is preserved (${harness.calls[0].url})`)
  harness.restore()
}

{
  const harness = mount({ config: { serverUrl: '' } })
  await harness.waterfall('user-questions/request', questionRequest(), async () => ({}))
  check(harness.calls.length === 0, 'an unset server URL sends nothing')
  harness.restore()
}

{
  const harness = mount({ config: { serverUrl: 'not a url' } })
  await harness.waterfall('user-questions/request', questionRequest(), async () => ({}))
  check(harness.calls.length === 0, 'an unusable server URL sends nothing')
  harness.restore()
}

{
  const harness = mount({ config: { appToken: undefined } })
  await harness.waterfall('user-questions/request', questionRequest(), async () => ({}))
  check(harness.calls.length === 0, 'a missing application credential sends nothing')
  harness.restore()
}

{
  const harness = mount({ config: { priority: 99 } })
  await harness.waterfall('user-questions/request', questionRequest(), async () => ({}))
  check(harness.calls[0].body.priority === 10, `an out-of-range priority is clamped (${harness.calls[0].body.priority})`)
  harness.restore()
}

{
  const harness = mount({ config: { priority: undefined } })
  await harness.waterfall('user-questions/request', questionRequest(), async () => ({}))
  check(harness.calls[0].body.priority === 8, 'a missing priority falls back to 8')
  harness.restore()
}

{
  const previous = process.env.DSH_WEB_URL
  process.env.DSH_WEB_URL = 'http://127.0.0.1:19387/'
  const harness = mount()
  await harness.waterfall('user-questions/request', questionRequest(), async () => ({}))
  check(harness.calls[0].body.extras['client::notification'].click.url === 'http://127.0.0.1:19387/', 'the notification links back to the harness')
  harness.restore()
  if (previous === undefined) delete process.env.DSH_WEB_URL
  else process.env.DSH_WEB_URL = previous
}
//#endregion

//#region Approvals
{
  const harness = mount()
  await harness.waterfall('approval/request', { agent: { id: 'session-root' }, toolName: 'bash', reason: 'writes outside the workspace' }, async () => 'unavailable')
  const call = harness.calls[0]
  check(harness.calls.length === 1, 'one push per approval request')
  check(call.body.title === 'DSH · 需要你批准', 'the approval title names the trigger')
  check(call.body.message.includes('bash'), 'the blocked tool is named')
  check(call.body.message.includes('writes outside the workspace'), 'the reason is included')
  harness.restore()
}

{
  const harness = mount({ config: { onApproval: false } })
  await harness.waterfall('approval/request', { agent: { id: 'session-root' }, toolName: 'bash' }, async () => 'unavailable')
  check(harness.calls.length === 0, 'the approval trigger can be switched off')
  harness.restore()
}
//#endregion

//#region Turn completion
const settle = () => new Promise((resolve) => setTimeout(resolve, SETTLE_WAIT_MS))

{
  const agent = { id: 'session-root' }
  const harness = mount()
  harness.emit('agent/status', { agent, status: 'running' })
  harness.emit('agent/status', { agent, status: 'idle' })
  await settle()
  const call = harness.calls[0]
  check(harness.calls.length === 1, 'an idle turn sends one completion push')
  check(call.body.title === 'DSH · 任务完成', 'the completion title names the trigger')
  check(call.body.message.includes('正在等待你的下一步输入'), 'a session without a goal gets the generic body')
  harness.restore()
}

{
  const agent = { id: 'session-root' }
  const goals = new Map([['session-root', { phase: 'complete', activation: 'disarmed', roundsStarted: 3, maxGoalRounds: 30, objective: '把插件做完' }]])
  const harness = mount({ goals })
  harness.emit('agent/status', { agent, status: 'running' })
  harness.emit('agent/status', { agent, status: 'idle' })
  await settle()
  const call = harness.calls[0]
  check(harness.calls.length === 1, 'a finished goal reports completion')
  check(call.body.message.includes('目标已完成'), 'the goal phase is reported')
  check(call.body.message.includes('3/30'), 'the round budget is reported')
  check(call.body.message.includes('把插件做完'), 'the objective is included')
  harness.restore()
}

{
  const agent = { id: 'session-root' }
  const goals = new Map([['session-root', { phase: 'blocked', activation: 'disarmed', blockedReason: { code: 'round-limit' }, roundsStarted: 30, maxGoalRounds: 30, objective: '把插件做完' }]])
  const harness = mount({ goals })
  harness.emit('agent/status', { agent, status: 'running' })
  harness.emit('agent/status', { agent, status: 'idle' })
  await settle()
  check(harness.calls[0].body.message.includes('目标被阻断（round-limit）'), 'an exhausted round budget is reported as a blocker')
  harness.restore()
}

{
  // The whole point of the rule: an armed active goal owns the next round.
  const agent = { id: 'session-root' }
  const goals = new Map([['session-root', { phase: 'active', activation: 'armed', roundsStarted: 1, maxGoalRounds: 30, objective: '把插件做完' }]])
  const harness = mount({ goals })
  harness.emit('agent/status', { agent, status: 'running' })
  harness.emit('agent/status', { agent, status: 'idle' })
  await settle()
  check(harness.calls.length === 0, 'an armed active goal suppresses the completion push')

  // The driver stops by completing the goal; the next idle edge reports it.
  goals.set('session-root', { phase: 'complete', activation: 'disarmed', roundsStarted: 2, maxGoalRounds: 30, objective: '把插件做完' })
  harness.emit('agent/status', { agent, status: 'running' })
  harness.emit('agent/status', { agent, status: 'idle' })
  await settle()
  check(harness.calls.length === 1, 'the push arrives once the goal stops')
  harness.restore()
}

{
  const agent = { id: 'session-child' }
  const harness = mount({ roots: [{ id: 'session-root' }] })
  harness.emit('agent/status', { agent, status: 'running' })
  harness.emit('agent/status', { agent, status: 'idle' })
  await settle()
  check(harness.calls.length === 0, 'a child agent never raises a completion push')
  harness.restore()
}

{
  const agent = { id: 'session-root' }
  const harness = mount({ config: { onTurnEnd: false } })
  harness.emit('agent/status', { agent, status: 'running' })
  harness.emit('agent/status', { agent, status: 'idle' })
  await settle()
  check(harness.calls.length === 0, 'the completion trigger can be switched off')
  harness.restore()
}

{
  // A turn that restarts inside the settle window must not announce finishing.
  const agent = { id: 'session-root' }
  const harness = mount()
  harness.emit('agent/status', { agent, status: 'running' })
  harness.emit('agent/status', { agent, status: 'idle' })
  await new Promise((resolve) => setTimeout(resolve, 200))
  harness.emit('agent/status', { agent, status: 'running' })
  await settle()
  check(harness.calls.length === 0, 'a turn that resumes cancels the pending push')
  harness.restore()
}

{
  // An idle report that never followed a running report is not a completion.
  const harness = mount()
  harness.emit('agent/status', { agent: { id: 'session-root' }, status: 'idle' })
  await settle()
  check(harness.calls.length === 0, 'an idle edge without a preceding turn sends nothing')
  harness.restore()
}
//#endregion

//#region Failures
{
  const agent = { id: 'session-root' }
  const harness = mount({ config: { onError: true } })
  harness.emit('agent/error', { agent, turn: 1, step: 1, error: new Error('provider exploded') })
  await new Promise((resolve) => setTimeout(resolve, 20))
  check(harness.calls.length === 1, 'a root turn failure pushes when enabled')
  check(harness.calls[0].body.message.includes('provider exploded'), 'the failure text is included')
  harness.restore()
}

{
  const harness = mount({ config: { onError: true }, roots: [{ id: 'session-root' }] })
  harness.emit('agent/error', { agent: { id: 'session-child' }, error: 'child failed' })
  await new Promise((resolve) => setTimeout(resolve, 20))
  check(harness.calls.length === 0, 'a child agent failure stays quiet')
  harness.restore()
}

{
  const harness = mount()
  harness.emit('agent/error', { agent: { id: 'session-root' }, error: 'off by default' })
  await new Promise((resolve) => setTimeout(resolve, 20))
  check(harness.calls.length === 0, 'the failure trigger is off by default')
  harness.restore()
}
//#endregion

//#region De-duplication
{
  const harness = mount()
  await harness.waterfall('user-questions/request', questionRequest(), async () => ({}))
  await harness.waterfall('user-questions/request', questionRequest(), async () => ({}))
  check(harness.calls.length === 1, `an identical push inside the window is dropped (${harness.calls.length})`)
  harness.restore()
}
//#endregion

//#region Browser RPC
{
  const harness = mount()
  const test = await harness.rpc('test')
  check(test.methods[0] === 'POST', 'the RPC route accepts POST')
  check(test.body.type === 'server-response' && test.body.rpcId === 'test-req', 'the RPC answer echoes the request id')
  check(test.body.result.ok === true && test.body.result.value.delivered === true, 'the test endpoint reports delivery')
  check(harness.calls.length === 1, 'the test endpoint sends one message')
  check(harness.calls[0].body.title.includes('测试通知'), 'the test message is labelled as such')

  const status = await harness.rpc('status')
  const value = status.body.result.value
  check(value.schemaAvailable === (plugin.Config !== undefined), 'status reports whether the schema resolved')
  check(value.configurable === true, 'status reports a configurable row')
  check(value.configured === true && value.tokenSet === true, 'status reports a configured target')
  check(value.serverUrl === 'https://push.example.com', 'status echoes the effective server URL')
  check(value.sent === 1, `status counts delivered messages (${value.sent})`)
  check(value.lastError === null, 'status reports no error after success')

  const unknown = await harness.rpc('nope')
  check(unknown.body.result.ok === false, 'an unknown endpoint is refused')
  check(String(unknown.body.result.error.message).includes('nope'), 'the refusal names the endpoint')
  harness.restore()
}

{
  const harness = mount({ respond: (n) => (n === 1 ? { ok: false, status: 401, text: async () => 'invalid token' } : okResponse()) })
  const failed = await harness.rpc('test')
  check(failed.body.result.value.delivered === false, 'a rejected push reports failure rather than throwing')
  check(String(failed.body.result.value.detail).includes('401'), 'the failure carries the status code')
  const status = await harness.rpc('status')
  check(String(status.body.result.value.lastError).includes('invalid token'), 'status keeps the last delivery error')
  harness.restore()
}

{
  const harness = mount({ configurableEntries: [] })
  const status = await harness.rpc('status')
  check(status.body.result.value.configurable === false, 'status detects a row that is not configurable')
  harness.restore()
}
//#endregion

console.log(failures.length === 0 ? '\nhost harness: all checks passed' : `\nhost harness: ${failures.length} failure(s)`)
for (const failure of failures) console.log(`- ${failure}`)
process.exitCode = failures.length === 0 ? 0 : 1
