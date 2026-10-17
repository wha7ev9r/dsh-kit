// Offline harness for the plugin's browser half.
//
// Runs the REAL lib/client.js against a minimal React runtime and a fake Cordis
// context, then drives the settings page: it checks the rendered controls, the
// staged-edit behaviour, and the exact path operations a save submits.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const CLIENT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'client.js')
const failures = []
const check = (condition, message) => {
  if (!condition) failures.push(message)
  console.log(`${condition ? 'ok  ' : 'FAIL'}  ${message}`)
}

//#region Minimal React runtime
function createReact() {
  let hooks = []
  let pendingEffects = []
  let cursor = 0
  let dirty = false

  const React = {
    createElement(type, props, ...children) {
      return { type, props: props ?? {}, children: children.flat(Infinity).filter((child) => child !== null && child !== undefined && child !== false) }
    },
    useState(initial) {
      const index = cursor++
      if (!Object.hasOwn(hooks, index)) hooks[index] = typeof initial === 'function' ? initial() : initial
      const set = (next) => {
        const value = typeof next === 'function' ? next(hooks[index]) : next
        if (value !== hooks[index]) {
          hooks[index] = value
          dirty = true
        }
      }
      return [hooks[index], set]
    },
    useMemo(factory) {
      cursor++
      return factory()
    },
    useCallback(fn) {
      cursor++
      return fn
    },
    useRef(value) {
      const index = cursor++
      if (!Object.hasOwn(hooks, index)) hooks[index] = { current: value }
      return hooks[index]
    },
    useEffect(fn) {
      cursor++
      pendingEffects.push(fn)
      return undefined
    },
  }

  /**
   * Mount one component with a fresh hook runtime and settle its state.
   * @param component - the component function to render.
   * @returns the settled tree and a re-render for later observations.
   */
  function mount(component) {
    hooks = []
    pendingEffects = []
    let element
    const pass = () => {
      let ranEffects = false
      for (let attempt = 0; attempt < 25; attempt++) {
        cursor = 0
        dirty = false
        element = component()
        if (!ranEffects) {
          ranEffects = true
          for (const effect of pendingEffects.splice(0)) effect()
          if (dirty) continue
          break
        }
        if (!dirty) break
      }
      return element
    }
    return { tree: pass(), rerender: pass }
  }

  return { React, mount }
}
//#endregion

//#region Element helpers
/** Depth-first walk of a rendered tree. */
function walk(node, visit) {
  if (node === null || node === undefined || typeof node !== 'object') return
  visit(node)
  for (const child of node.children ?? []) walk(child, visit)
}

/** @returns every rendered element whose props.id matches. */
function byId(tree, id) {
  const found = []
  walk(tree, (node) => {
    if (node.props?.id === id) found.push(node)
  })
  return found
}

/** @returns every rendered element of one tag. */
function byTag(tree, tag) {
  const found = []
  walk(tree, (node) => {
    if (node.type === tag) found.push(node)
  })
  return found
}

/** @returns all text content in the tree. */
function textOf(tree) {
  const parts = []
  walk(tree, (node) => {
    for (const child of node.children ?? []) if (typeof child === 'string') parts.push(child)
  })
  return parts.join(' | ')
}

/** @returns the button whose label text matches. */
function buttonLabelled(tree, label) {
  return byTag(tree, 'button').find((node) => node.children.includes(label))
}
//#endregion

//#region Fake Cordis context
function createContext({ snapshot, namespaceView, locale = 'zh' }) {
  const dictionaries = new Map()
  const listeners = new Set()
  const state = {
    slotRegistrations: [],
    registered: null,
    mutateCalls: [],
    unsetCalls: [],
    entryId: null,
    injectKey: null,
    rpcChannel: null,
  }

  const scope = {
    getSnapshot: () => snapshot.value,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    mutate: async (ops, revision) => {
      state.mutateCalls.push({ ops, revision })
      for (const op of ops) {
        const next = { ...snapshot.value.value }
        if (op.op === 'set') next[op.path[0]] = op.value
        else delete next[op.path[0]]
        snapshot.value.value = next
      }
      for (const listener of listeners) listener()
      return true
    },
    unset: async (field) => {
      state.unsetCalls.push(field)
      const next = { ...snapshot.value.value }
      delete next[field]
      snapshot.value.value = next
      for (const listener of listeners) listener()
      return true
    },
  }

  const mirror = {
    getSnapshot: () => ({ view: { writable: true, namespaces: namespaceView() } }),
    subscribe: () => () => {},
  }

  const translate = (key) => dictionaries.get('wha7ev9r.gotifyNotify')?.[locale]?.[key] ?? key

  const ctx = {
    locale: {
      bind: () => translate,
      register: (ns, dicts) => {
        dictionaries.set(ns, dicts)
        return () => {}
      },
      subscribe: () => () => {},
      getSnapshot: () => ({ revision: 0, locale }),
    },
    effect: (fn) => {
      fn()
      return () => {}
    },
    configForms: {
      get: (entryId) => {
        state.entryId = entryId
        return scope
      },
      describe: () => mirror,
    },
    slots: {
      inject: (key, callback) => {
        state.injectKey = key
        callback()
        return () => {}
      },
      register: (definition, component) => {
        state.slotRegistrations.push(definition)
        state.registered = component
        return () => {}
      },
    },
    connection: {
      rpc: {
        call: async (_base, channel, call) => {
          state.rpcChannel = channel
          if (call.endpoint === 'status') return { ok: true, value: { schemaAvailable: true, configurable: true, configured: true, serverUrl: 'https://push.example.com', tokenSet: true, lastError: null, sent: 0 } }
          if (call.endpoint === 'test') return { ok: true, value: { delivered: true, detail: 'HTTP 200' } }
          return { ok: false, error: { message: `unknown endpoint ${call.endpoint}` } }
        },
      },
    },
  }

  return { ctx, state }
}

/** Build a ready scope snapshot holding the Host's effective values. */
function readySnapshot(overrides = {}) {
  return {
    value: {
      status: 'ready',
      writable: true,
      revision: 7,
      mode: 'host',
      value: {
        enabled: true,
        serverUrl: '',
        priority: 8,
        titlePrefix: 'DeepSeek Harness',
        onQuestion: true,
        onTurnEnd: true,
        onApproval: true,
        onError: false,
        mentionSession: true,
        ...overrides,
      },
    },
  }
}
//#endregion

//#region Load the real client module
let registration
const fakeWindow = { __ModuleLoader__: { load: (definition) => { registration = definition } } }
new Function('window', readFileSync(CLIENT, 'utf8'))(fakeWindow)

check(registration !== undefined, 'client module registers through window.__ModuleLoader__')
check(registration?.id === '@wha7ever/dsh-gotify-notify', `module id equals the package name (got ${registration?.id})`)

const { React, mount } = createReact()
const client = registration.factory((request) => {
  check(request === 'react', `the client half requires only react (asked for ${request})`)
  return React
})

check(typeof client.apply === 'function', 'client exports apply()')
check(Array.isArray(client.inject), 'client exports an inject list')
for (const service of ['connection', 'slots', 'locale', 'configForms']) {
  check(client.inject.includes(service), `client injects ${service}`)
}
//#endregion

//#region Ready state: the page renders and saves exactly what was staged
{
  const holder = readySnapshot()
  const { ctx, state } = createContext({
    snapshot: holder,
    namespaceView: () => [{ ns: 'gotify-notify', value: holder.value.value, secrets: [{ path: ['appToken'], set: true }] }],
  })
  client.apply(ctx)
  check(state.entryId === 'gotify-notify', `the page edits the gotify-notify namespace (${state.entryId})`)
  check(state.injectKey === 'settings.section', `the page registers into settings.section (${state.injectKey})`)

  const definition = state.slotRegistrations[0]
  check(definition?.name === 'settings.section', 'slot registration names settings.section')
  check(definition?.id === 'gotify-notify', `slot registration id is gotify-notify (${definition?.id})`)
  check(typeof definition?.order === 'number', 'slot registration carries an order')
  check(definition?.label?.() === 'Gotify 提醒', `nav label reads from the zh dictionary (${definition?.label?.()})`)

  const view = mount(state.registered)
  const text = textOf(view.tree)
  check(text.includes('Gotify 提醒'), 'the page renders its heading')

  check(byId(view.tree, 'gotify-server-url').length === 1, 'renders the server URL field')
  check(byId(view.tree, 'gotify-app-token').length === 1, 'renders the application credential field')
  check(byId(view.tree, 'gotify-priority').length === 1, 'renders the priority control')
  check(byId(view.tree, 'gotify-title-prefix').length === 1, 'renders the title prefix field')

  const priority = byId(view.tree, 'gotify-priority')[0]
  check(priority.children.length === 11, `priority offers 0..10 (${priority.children.length} options)`)
  check(priority.props.value === '8', `priority shows the effective default (${priority.props.value})`)

  const SWITCHES = ['mentionSession', 'enabled', 'onQuestion', 'onTurnEnd', 'onApproval', 'onError']
  for (const key of SWITCHES) {
    check(byId(view.tree, `gotify-${key}`).length === 1, `renders the ${key} switch`)
  }
  check(byId(view.tree, 'gotify-enabled')[0].props.checked === true, 'enable defaults on')
  check(byId(view.tree, 'gotify-onError')[0].props.checked === false, 'the failure switch defaults off')
  check(byTag(view.tree, 'label').filter((node) => node.props.htmlFor?.startsWith('gotify-')).length === 10, 'every control has a label wired by id')

  check(byId(view.tree, 'gotify-app-token')[0].props.value === '', 'the credential control starts blank')
  check(text.includes('已配置令牌'), 'the credential badge reports the stored secret without revealing it')

  // Stage edits, then save.
  byId(view.tree, 'gotify-server-url')[0].props.onChange({ target: { value: 'https://push.example.com/gotify' } })
  byId(view.tree, 'gotify-app-token')[0].props.onChange({ target: { value: 'new-app-token' } })
  byId(view.tree, 'gotify-priority')[0].props.onChange({ target: { value: '10' } })
  byId(view.tree, 'gotify-enabled')[0].props.onChange({ target: { checked: false } })

  const afterEdit = view.rerender()
  const saveButton = buttonLabelled(afterEdit, '保存')
  check(saveButton !== undefined, 'renders a save button')
  check(saveButton.props.disabled === false, 'save is enabled once the form is dirty and valid')

  await saveButton.props.onClick()
  const call = state.mutateCalls.at(-1)
  check(call !== undefined, 'save submits one mutate call')
  check(call?.revision === 7, `save fences on the revision it read (${call?.revision})`)

  const ops = call?.ops ?? []
  const find = (field) => ops.find((op) => op.path?.[0] === field)
  check(find('serverUrl')?.op === 'set' && find('serverUrl').value === 'https://push.example.com/gotify', 'serverUrl is written')
  check(find('priority')?.op === 'set' && find('priority').value === 10, `priority is written as a number (${find('priority')?.value})`)
  check(find('enabled')?.value === false, 'the enable switch is written')
  check(find('onError')?.value === false, 'an off switch is written explicitly, not omitted')
  check(find('appToken')?.value === 'new-app-token', 'a typed credential is written')
  check(ops.filter((op) => op.path?.[0] === 'appToken').length === 1, 'the credential is written once')
  check(ops.every((op) => op.op === 'set' || op.op === 'unset'), 'every submitted operation is a set or an unset')

  const settled = view.rerender()
  check(buttonLabelled(settled, '保存').props.disabled === true, 'the form is clean again after a save')
  check(textOf(settled).includes('已保存'), 'the page confirms the save')
}
//#endregion

//#region Clearing the stored credential is its own explicit action
{
  const holder = readySnapshot()
  const { ctx, state } = createContext({
    snapshot: holder,
    namespaceView: () => [{ ns: 'gotify-notify', value: holder.value.value, secrets: [{ path: ['appToken'], set: true }] }],
  })
  client.apply(ctx)
  const view = mount(state.registered)
  const clear = buttonLabelled(view.tree, '清除令牌')
  check(clear !== undefined, 'renders a clear-credential action')
  check(clear.props.disabled === false, 'clear is enabled while a credential is stored')
  await clear.props.onClick()
  check(state.unsetCalls.at(-1) === 'appToken', 'clearing submits an unset for the credential field')
}

// Without a stored credential the clear action is refused rather than no-op.
{
  const holder = readySnapshot()
  const { ctx, state } = createContext({ snapshot: holder, namespaceView: () => [{ ns: 'gotify-notify', value: holder.value.value, secrets: [] }] })
  client.apply(ctx)
  const view = mount(state.registered)
  check(textOf(view.tree).includes('尚未配置令牌'), 'no stored credential is reported as such')
  check(buttonLabelled(view.tree, '清除令牌').props.disabled === true, 'clear is disabled with nothing to clear')
  check(state.unsetCalls.length === 0, 'a disabled clear submits nothing')
}
//#endregion

//#region An empty credential draft never clears the stored secret
{
  const holder = readySnapshot()
  const { ctx, state } = createContext({ snapshot: holder, namespaceView: () => [] })
  client.apply(ctx)
  const view = mount(state.registered)
  byId(view.tree, 'gotify-server-url')[0].props.onChange({ target: { value: 'https://other.example' } })
  const afterEdit = view.rerender()
  await buttonLabelled(afterEdit, '保存').props.onClick()
  const ops = state.mutateCalls.at(-1).ops
  check(ops.every((op) => op.path[0] !== 'appToken'), 'an untouched credential field submits no credential op')
  check(ops.find((op) => op.path[0] === 'serverUrl').value === 'https://other.example', 'the edited field still saves')
}
//#endregion

//#region Invalid priority blocks the save
{
  const holder = readySnapshot()
  const { ctx, state } = createContext({ snapshot: holder, namespaceView: () => [] })
  client.apply(ctx)
  const view = mount(state.registered)
  byId(view.tree, 'gotify-priority')[0].props.onChange({ target: { value: '99' } })
  const afterEdit = view.rerender()
  check(textOf(afterEdit).includes('请填 0 到 10 之间的整数'), 'an out-of-range priority is reported')
  check(buttonLabelled(afterEdit, '保存').props.disabled === true, 'an invalid draft cannot be saved')
  check(state.mutateCalls.length === 0, 'an invalid draft submits nothing')
}
//#endregion

//#region Unavailable namespace: a precise diagnostic, no controls
{
  const holder = { value: { status: 'unavailable', writable: false, revision: undefined, mode: 'host', value: undefined } }
  const { ctx, state } = createContext({ snapshot: holder, namespaceView: () => [] })
  client.apply(ctx)
  const tree = mount(state.registered).tree
  const text = textOf(tree)
  check(text.includes('没有提供可配置的 gotify-notify 行'), 'an unavailable namespace explains itself')
  check(byId(tree, 'gotify-server-url').length === 0, 'no editable fields are shown while unavailable')
  check(buttonLabelled(tree, '保存').props.disabled === true, 'saving is refused while unavailable')
  check(buttonLabelled(tree, '发送测试通知') !== undefined, 'the host-side test action stays reachable')
}
//#endregion

//#region Loading state
{
  const holder = { value: { status: 'loading', writable: false, revision: undefined, mode: 'host', value: undefined } }
  const { ctx, state } = createContext({ snapshot: holder, namespaceView: () => [] })
  client.apply(ctx)
  const tree = mount(state.registered).tree
  check(textOf(tree).includes('正在读取当前 profile 的配置'), 'the loading state says so')
  check(byId(tree, 'gotify-server-url').length === 0, 'no fields are rendered while loading')
}
//#endregion

//#region English locale
{
  const holder = readySnapshot()
  const { ctx, state } = createContext({ snapshot: holder, namespaceView: () => [], locale: 'en' })
  client.apply(ctx)
  const definition = state.slotRegistrations[0]
  check(definition.label() === 'Gotify alerts', `the en dictionary drives the nav label (${definition.label()})`)
  const tree = mount(state.registered).tree
  check(textOf(tree).includes('Gotify alerts'), 'the page renders its English heading')
  check(textOf(tree).includes('Send a test notification'), 'the test action is translated')
}
//#endregion

console.log(failures.length === 0 ? '\nclient harness: all checks passed' : `\nclient harness: ${failures.length} failure(s)`)
for (const failure of failures) console.log(`- ${failure}`)
process.exitCode = failures.length === 0 ? 0 : 1
