// Offline harness for the browser half.
//
// The REAL lib/client.js is loaded through a stubbed module loader, mounted
// with a small React runtime, and driven with a fake Host report. It checks the
// slot registrations, the dictionaries, the update rows, the official line, the
// copy action, ignore/restore, and the detail badge/section.
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

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
      const normalized = children.flat(Infinity).filter((child) => child !== null && child !== undefined && child !== false)
      const finalProps = { ...(props ?? {}) }
      if (normalized.length > 0 && finalProps.children === undefined) {
        finalProps.children = normalized.length === 1 ? normalized[0] : normalized
      }
      return { type, props: finalProps }
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
    useEffect(fn) {
      cursor++
      pendingEffects.push(fn)
    },
  }

  const render = (node) => {
    if (node === null || node === undefined || node === false) return ''
    if (typeof node === 'string' || typeof node === 'number') return String(node)
    if (Array.isArray(node)) return node.map(render).filter(Boolean).join(' ')
    if (typeof node.type === 'function') return render(node.type(node.props))
    return render(node.props?.children)
  }

  const mount = (component, props) => {
    hooks = []
    pendingEffects = []
    let tree
    for (let attempt = 0; attempt < 20; attempt++) {
      cursor = 0
      dirty = false
      tree = component(props)
      if (attempt === 0) {
        for (const effect of pendingEffects.splice(0)) effect()
        if (dirty) continue
        break
      }
      break
    }
    return { tree, text: render(tree).replace(/\s+/g, ' ').trim() }
  }

  return { React, mount, render }
}
//#endregion

//#region Fake browser context
let clipboardText = null
Object.defineProperty(globalThis, 'navigator', {
  value: { clipboard: { writeText: async (value) => { clipboardText = value } } },
  configurable: true,
  writable: true,
})

const styles = []
globalThis.document = {
  createElement(tag) {
    return {
      tag,
      dataset: {},
      textContent: '',
      remove() {},
    }
  },
  head: {
    append(node) {
      styles.push(node)
    },
  },
}

let captured
globalThis.window = {
  __ModuleLoader__: {
    load(definition) {
      captured = definition
    },
  },
}

const clientPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'client.js')
await import(`${clientPath}?test=${Date.now()}`)
check(captured?.id === '@wha7ever/dsh-plugin-updates', 'the client module id equals the package name')
check(typeof captured?.factory === 'function', 'the client module registers a factory')

const { React, mount, render } = createReact()
const client = captured.factory((id) => {
  if (id === 'react') return React
  throw new Error(`unexpected client require: ${id}`)
})

const registrations = []
const dictionaries = {}
const subscribed = []
const lifecycle = []
const rpcCalls = []
let fakeReport

const ctx = {
  effect(fn) {
    const cleanup = fn()
    if (typeof cleanup === 'function') lifecycle.push(cleanup)
  },
  remote: {
    $on(name, callback) {
      subscribed.push({ name, callback })
      return () => {}
    },
  },
  locale: {
    register(namespace, dicts) {
      dictionaries[namespace] = dicts
      return () => {}
    },
    bind(namespace) {
      return (key, params) => {
        const dict = dictionaries[namespace]?.zh ?? {}
        let text = dict[key] ?? key
        for (const [name, value] of Object.entries(params ?? {})) text = text.replaceAll(`{${name}}`, String(value))
        return text
      }
    },
    getSnapshot() {
      return { id: 'zh', revision: 0 }
    },
    resolveText(value) {
      return value
    },
  },
  slots: {
    inject(name, callback) {
      callback()
      return () => {}
    },
    register(options, component) {
      registrations.push({ options, component })
      return () => {}
    },
  },
  connection: {
    rpc: {
      async call(base, channel, request) {
        rpcCalls.push({ base, channel, request })
        return { ok: true, value: fakeReport }
      },
    },
  },
}

fakeReport = {
  available: true,
  enabled: true,
  profile: 'desktop',
  checkedAt: 1750000000000,
  checking: false,
  stale: false,
  error: null,
  sources: ['npmmirror'],
  unavailableSources: [],
  official: {
    runtime: '0.2.1-rc.2',
    latest: '0.2.1-rc.2',
    channel: 'next',
    updateAvailable: false,
    bundleCount: 10,
    checkedFrom: 'npmmirror',
    error: null,
  },
  items: [
    {
      name: '@wha7ever/dsh-mcp-console',
      version: '0.1.0',
      latest: '0.1.1',
      status: 'update',
      sourceKind: 'registry',
      source: '@wha7ever/dsh-mcp-console@0.1.0',
      channel: 'latest',
      checkedFrom: 'npmmirror',
      reason: null,
      npmUrl: 'https://npmx.dev/package/@wha7ever/dsh-mcp-console',
      command: 'dsh plugin --profile desktop add "@wha7ever/dsh-mcp-console@0.1.1"',
    },
    {
      name: '@wha7ever/dsh-gotify-notify',
      version: '0.1.3',
      latest: '0.1.3',
      status: 'current',
      sourceKind: 'registry',
      source: '@wha7ever/dsh-gotify-notify@latest',
      channel: 'latest',
      checkedFrom: 'npmmirror',
      reason: null,
      npmUrl: 'https://npmx.dev/package/@wha7ever/dsh-gotify-notify',
      command: null,
    },
    {
      name: 'local-tool',
      version: '1.0.0',
      latest: null,
      status: 'unknown',
      sourceKind: 'local',
      source: 'file:C:\\tmp\\local-tool',
      channel: null,
      checkedFrom: null,
      reason: 'local',
      npmUrl: 'https://npmx.dev/package/local-tool',
      command: null,
    },
  ],
  counts: { thirdParty: 3, official: 10, updates: 1, unknown: 1 },
}

client.apply(ctx)

check(client.inject.join(',') === 'connection,slots,locale,remote,remote.pluginManager', 'the client declares connection, slots, locale, remote, and the plugin-manager remote')
check(dictionaries['wha7ev9r.pluginUpdates']?.zh?.title === '更新', 'the Chinese dictionary is registered')
check(dictionaries['wha7ev9r.pluginUpdates']?.en?.title === 'Updates', 'the English dictionary is registered')
check(styles.length === 1 && styles[0].textContent.includes('.dsh-updates-root'), 'the client injects its stylesheet')
check(subscribed.some((entry) => entry.name === 'plugin-manager/changed'), 'the client subscribes to plugin-manager changes')
check(rpcCalls.length === 0, 'the client does not call the Host until a slot renders')

const tab = registrations.find((entry) => entry.options.name === 'plugins.tab')
const badge = registrations.find((entry) => entry.options.name === 'plugins.detail.badge')
const section = registrations.find((entry) => entry.options.name === 'plugins.detail.section')
check(tab?.options.id === 'updates' && tab?.options.order === -10, 'the Updates tab is first among the contributed tabs')
check(tab?.options.label() === '更新', 'the tab label follows the active locale')
check(badge?.options.id === 'plugin-updates.badge' && section?.options.id === 'plugin-updates.section', 'the detail badge and section register')

function createStore(report, overrides = {}) {
  const snapshot = { phase: 'idle', report, error: null, ignored: {}, ...overrides }
  const listeners = new Set()
  const calls = []
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    notify() {
      for (const listener of listeners) listener()
    },
    async load(input = {}) {
      calls.push(input)
    },
    isIgnored(item) {
      return item !== null && typeof item === 'object' && snapshot.ignored[item.name] === item.latest
    },
    ignore(name, version) {
      snapshot.ignored = { ...snapshot.ignored, [name]: version }
      this.notify()
    },
    restore(name) {
      const next = { ...snapshot.ignored }
      delete next[name]
      snapshot.ignored = next
      this.notify()
    },
    get localeId() {
      return 'zh'
    },
    calls,
  }
}

function findButton(tree, text) {
  if (tree === null || tree === undefined || typeof tree !== 'object') return undefined
  if (Array.isArray(tree)) {
    for (const child of tree) {
      const found = findButton(child, text)
      if (found !== undefined) return found
    }
    return undefined
  }
  if (typeof tree.type === 'function') return findButton(tree.type(tree.props), text)
  if (typeof tree.type === 'string' && tree.type === 'button' && (tree.props?.children === text || String(tree.props?.children).includes(text))) {
    return tree
  }
  return findButton(tree.props?.children, text)
}

//#region Updates tab
{
  const store = tab.options.inject().store
  await store.load()
  const mounted = mount(tab.component, { t: ctx.locale.bind('wha7ev9r.pluginUpdates'), store, openPackage: () => {} })
  check(mounted.text.includes('@wha7ever/dsh-mcp-console'), 'the tab lists an updatable package')
  check(mounted.text.includes('0.1.0') && mounted.text.includes('0.1.1'), 'the tab shows current and target versions')
  check(mounted.text.includes('1 个插件可更新'), 'the summary counts updates')
  check(mounted.text.includes('复制更新命令'), 'the update row offers the copy command')
  check(mounted.text.includes('无法检查 (1)'), 'the unknown section is present')
  check(rpcCalls.some((call) => call.channel === 'plugin-updates' && call.request.endpoint === 'report'), 'the tab asks the Host for its report')

  const copyButton = findButton(mounted.tree, '复制更新命令')
  check(copyButton !== undefined, 'the copy button is reachable')
  await copyButton?.props.onClick()
  check(clipboardText === 'dsh plugin --profile desktop add "@wha7ever/dsh-mcp-console@0.1.1"', 'the copy action writes the exact command')

  const checkButton = findButton(mounted.tree, '立即检查')
  check(checkButton !== undefined, 'the manual check button is present')
  checkButton?.props.onClick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  check(rpcCalls.at(-1)?.request?.payload?.force === true && rpcCalls.at(-1)?.request?.payload?.wait === true, 'the manual check forces a sweep and waits')
}

{
  const ignoredReport = JSON.parse(JSON.stringify(fakeReport))
  ignoredReport.items = ignoredReport.items.filter((item) => item.status === 'current')
  ignoredReport.counts = { thirdParty: 1, official: 10, updates: 0, unknown: 0 }
  const store = createStore(ignoredReport)
  const mounted = mount(tab.component, { t: ctx.locale.bind('wha7ev9r.pluginUpdates'), store, openPackage: () => {} })
  check(mounted.text.includes('全部已是最新'), 'the empty state appears when nothing is updatable')
}

{
  const store = createStore(fakeReport)
  const mounted = mount(tab.component, { t: ctx.locale.bind('wha7ev9r.pluginUpdates'), store, openPackage: () => {} })
  const ignoreButton = findButton(mounted.tree, '忽略此版本')
  check(ignoreButton !== undefined, 'the ignore action is reachable')
  ignoreButton?.props.onClick()
  check(store.isIgnored({ name: '@wha7ever/dsh-mcp-console', latest: '0.1.1' }), 'ignoring hides the exact target version')
}
//#endregion

//#region Detail contributions
{
  const store = createStore(fakeReport)
  const subject = { kind: 'bundle', pkg: { name: '@wha7ever/dsh-mcp-console', version: '0.1.0', official: false } }
  const mounted = mount(badge.component, { t: ctx.locale.bind('wha7ev9r.pluginUpdates'), store, subject })
  check(mounted.text.includes('可更新 0.1.1'), 'the detail badge shows the available version')

  const sectionMounted = mount(section.component, { t: ctx.locale.bind('wha7ev9r.pluginUpdates'), store, subject })
  check(sectionMounted.text.includes('当前版本') && sectionMounted.text.includes('最新版本'), 'the detail section compares current and latest')
  check(sectionMounted.text.includes('dsh plugin --profile desktop add'), 'the detail section repeats the command')
  check(sectionMounted.text.includes('卸载后重装'), 'the detail section explains the manual update path')
}

{
  const store = createStore(fakeReport)
  const mounted = mount(badge.component, { t: ctx.locale.bind('wha7ev9r.pluginUpdates'), store, subject: { kind: 'bundle', pkg: { name: 'unknown', version: '1.0.0', official: false } } })
  check(mounted.text === '', 'the badge renders nothing for a plugin without an update')
}
//#endregion

if (failures.length) {
  console.error(`client.test: ${failures.length} failure(s)`)
  process.exitCode = 1
} else {
  console.log('client.test: passed')
}
