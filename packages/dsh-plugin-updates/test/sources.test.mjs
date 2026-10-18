// Source-chain checks for the update checker.
//
// These tests replace global fetch, so no network is involved: they pin the
// fallback order, the dist-tag manifest protocol, the packument fallback, the
// private-registry rule, the circuit breaker, and GitHub ref/path parsing.
import {
  NPMMIRROR_REGISTRY,
  OFFICIAL_NPM_REGISTRY,
  PUBLIC_SOURCES,
  SourceHealth,
  buildRegistryPlan,
  fetchGithubVersion,
  fetchOfficialVersion,
  fetchTagVersion,
  normalizeRegistry,
  parseGithubSource,
  parseSource,
  sanitizeSource,
} from '../lib/sources.js'

const failures = []
const check = (condition, message) => {
  if (!condition) failures.push(message)
  console.log(`${condition ? 'ok  ' : 'FAIL'}  ${message}`)
}

const options = { requestTimeoutMs: 500, githubTimeoutMs: 500, githubProxy: '' }
const npmmirror = { id: 'npmmirror', kind: 'registry', url: NPMMIRROR_REGISTRY, supportsPackument: true }

/** Replace global fetch for one test. @param {(url: string, init: object) => Promise<Response>} handler @returns {() => void} restore. */
function stubFetch(handler) {
  const previous = globalThis.fetch
  globalThis.fetch = async (url, init) => handler(String(url), init)
  return () => { globalThis.fetch = previous }
}

/** @param {unknown} body @param {number} [status] @returns {Response} a JSON response. */
function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

//#region Normalization and parsing
check(normalizeRegistry('https://registry.npmmirror.com') === NPMMIRROR_REGISTRY, 'normalizeRegistry adds a trailing slash')
check(normalizeRegistry('https://registry.npmmirror.com/?a=1#x') === NPMMIRROR_REGISTRY, 'normalizeRegistry drops query and hash')
check(normalizeRegistry('ftp://example.com') === undefined, 'normalizeRegistry rejects a non-http protocol')
check(normalizeRegistry('https://user:pass@example.com/') === undefined, 'normalizeRegistry rejects user information')

const publicPlan = buildRegistryPlan({ registry: null, fallbackRegistries: [NPMMIRROR_REGISTRY], resolved: NPMMIRROR_REGISTRY }, {})
check(publicPlan.map((source) => source.id).join(',') === 'npmmirror,npmjs,tencent,jsdelivr,npmx', 'public plan keeps npmmirror first and adds the configured fallbacks')
const privateResolved = buildRegistryPlan({ registry: null, fallbackRegistries: [NPMMIRROR_REGISTRY], resolved: 'https://npm.internal.example/' }, {})
check(privateResolved.length === 1 && privateResolved[0].id === 'npm.internal.example', 'a private pnpm registry is asked alone')
const privateConfigured = buildRegistryPlan({ registry: 'https://npm.internal.example/', fallbackRegistries: [], resolved: null }, {})
check(privateConfigured.length === 1 && privateConfigured[0].id === 'npm.internal.example', 'a private configured registry with no fallback is asked alone')
const customFallbacks = buildRegistryPlan({ registry: null, fallbackRegistries: [NPMMIRROR_REGISTRY], resolved: NPMMIRROR_REGISTRY }, { fallbackSources: ['npmjs'] })
check(customFallbacks.map((source) => source.id).join(',') === 'npmmirror,npmjs', 'fallbackSources limits the public tail')
const unknownPlan = buildRegistryPlan(null, {})
check(unknownPlan[0].id === 'npmmirror' && unknownPlan.some((source) => source.id === 'npmjs'), 'no known registry keeps npmmirror first, then npmjs')

const exact = parseSource('@scope/pkg', '@scope/pkg@1.2.3')
check(exact.kind === 'registry' && exact.exact === true && exact.tag === null, 'an exact registry version is recognized')
const tag = parseSource('@scope/pkg', '@scope/pkg@next')
check(tag.kind === 'registry' && tag.tag === 'next', 'a dist-tag registry value is recognized')
const range = parseSource('@scope/pkg', '@scope/pkg@^1.0.0')
check(range.kind === 'registry' && range.range === true, 'a registry range is recognized')
const alias = parseSource('@scope/pkg', '@scope/pkg@npm:other@1.0.0')
check(alias.kind === 'unknown' && alias.reason === 'alias', 'an npm alias is not checked')
const gitSource = parseSource('pkg', 'github:wha7ev9r/dsh-kit#path:packages/dsh-plugin-updates')
check(gitSource.kind === 'git' && gitSource.git?.path === 'packages/dsh-plugin-updates', 'a git #path: source is parsed')
const localSource = parseSource('pkg', 'file:C:\\tmp\\pkg')
check(localSource.kind === 'local', 'a local file source is recognized')
const tarballSource = parseSource('pkg', 'https://example.com/pkg.tgz')
check(tarballSource.kind === 'tarball', 'a tarball URL is recognized')
check(parseSource('pkg', undefined).kind === 'unknown', 'an absent source is unknown')

const github = parseGithubSource('https://github.com/wha7ev9r/dsh-kit#path:packages/dsh-plugin-updates')
check(github?.owner === 'wha7ev9r' && github?.repo === 'dsh-kit' && github?.path === 'packages/dsh-plugin-updates', 'parseGithubSource accepts a hosted URL with #path:')
const githubRef = parseGithubSource('github:wha7ev9r/dsh-kit#main&path:packages/foo')
check(githubRef?.ref === 'main' && githubRef?.path === 'packages/foo', 'parseGithubSource separates ref and #path:')
const githubSsh = parseGithubSource('git@github.com:wha7ev9r/dsh-kit.git')
check(githubSsh?.owner === 'wha7ev9r' && githubSsh?.repo === 'dsh-kit', 'parseGithubSource accepts an scp-like address')
check(parseGithubSource('github:../escape#path:..') === undefined, 'parseGithubSource rejects traversal')

check(sanitizeSource('https://user:pass@github.com/a/b.git') === 'https://github.com/a/b.git', 'sanitizeSource removes user information')
check(sanitizeSource(null) === null, 'sanitizeSource keeps an absent source absent')
//#endregion

//#region Circuit breaker
const health = new SourceHealth({ failures: 2, cooldownMs: 60000 })
check(health.available('npmjs'), 'a fresh source is available')
health.fail('npmjs')
check(health.available('npmjs'), 'one failure does not cool a source down')
health.fail('npmjs')
check(!health.available('npmjs'), 'two failures cool a source down')
check(health.unavailable().includes('npmjs'), 'unavailable reports the cooled-down source')
health.succeed('npmjs')
check(health.available('npmjs'), 'a success clears the record')
health.auth('npmjs')
check(!health.available('npmjs'), 'auth cools a source down')
health.reset()
check(health.available('npmjs'), 'reset clears every record')
//#endregion

//#region Tag manifests and fallback
{
  const calls = []
  const restore = stubFetch(async (url) => {
    calls.push(url)
    if (url.includes('registry.npmjs.org')) throw new TypeError('fetch failed')
    return json({ version: '1.2.4' })
  })
  try {
    const result = await fetchTagVersion('pkg', ['latest'], [PUBLIC_SOURCES.npmjs, npmmirror], options, new SourceHealth(), undefined)
    check(result.version === '1.2.4' && result.source === 'npmmirror', 'a failed source falls through to the next registry')
    check(calls.some((url) => url.includes('registry.npmjs.org')) && calls.some((url) => url.includes('registry.npmmirror.com')), 'both registries were asked')
  } finally {
    restore()
  }
}

{
  const restore = stubFetch(async (url) => {
    if (url.endsWith('/next')) return json({ error: 'not found' }, 404)
    if (url.endsWith('/latest')) return json({ version: '1.0.0' })
    return json({ error: 'not found' }, 404)
  })
  try {
    const result = await fetchTagVersion('pkg', ['next', 'latest'], [npmmirror], options, new SourceHealth(), undefined)
    check(result.version === '1.0.0' && result.channel === 'latest', 'a missing next tag falls back to latest on the same source')
  } finally {
    restore()
  }
}

{
  const restore = stubFetch(async (url) => {
    if (url.endsWith('/latest')) return json({ error: 'not found' }, 404)
    return json({ versions: { '1.0.0': {}, '1.1.0': {}, '1.2.0-beta.1': {} } })
  })
  try {
    const result = await fetchTagVersion('pkg', ['latest'], [npmmirror], options, new SourceHealth(), undefined)
    check(result.version === '1.1.0', 'a missing tag falls back to the highest stable packument version')
  } finally {
    restore()
  }
}

{
  const calls = []
  const restore = stubFetch(async (url) => {
    calls.push(url)
    return json({ error: 'auth' }, 401)
  })
  try {
    const result = await fetchTagVersion('pkg', ['latest'], [npmmirror, PUBLIC_SOURCES.npmjs], options, new SourceHealth(), undefined)
    check(result.auth === true && result.source === 'npmmirror', 'an authenticated source is reported as private')
    check(calls.length === 1, 'a private source does not fall through to a public source')
  } finally {
    restore()
  }
}

{
  const restore = stubFetch(async (url) => {
    if (url.endsWith('/next')) return json({ version: '0.2.1-rc.3' })
    if (url.endsWith('/latest')) return json({ version: '0.2.0' })
    return json({ error: 'not found' }, 404)
  })
  try {
    const result = await fetchOfficialVersion('@deepseek-ai/dsh', ['next', 'latest'], [npmmirror], options, new SourceHealth(), undefined)
    check(result.version === '0.2.1-rc.3', 'the official line takes the greater of next and latest')
  } finally {
    restore()
  }
}
//#endregion

//#region GitHub manifest
{
  const restore = stubFetch(async (url) => {
    if (url.includes('raw.githubusercontent.com')) return json({ version: '0.2.0' })
    return json({ error: 'not found' }, 404)
  })
  try {
    const result = await fetchGithubVersion({ owner: 'wha7ev9r', repo: 'dsh-kit', path: 'packages/dsh-plugin-updates' }, options, new SourceHealth(), undefined)
    check(result.version === '0.2.0' && result.checkedFrom === 'github-raw', 'GitHub raw is the first manifest source')
  } finally {
    restore()
  }
}

{
  const restore = stubFetch(async (url) => {
    if (url.includes('raw.githubusercontent.com')) return json({ error: 'not found' }, 404)
    if (url.includes('@main/')) return json({ version: '0.2.1' })
    return json({ error: 'not found' }, 404)
  })
  try {
    const result = await fetchGithubVersion({ owner: 'wha7ev9r', repo: 'dsh-kit', path: 'packages/dsh-plugin-updates' }, options, new SourceHealth(), undefined)
    check(result.version === '0.2.1' && result.checkedFrom === 'github-jsdelivr', 'jsDelivr GitHub is the second manifest source')
  } finally {
    restore()
  }
}

{
  const restore = stubFetch(async () => json({ error: 'not found' }, 404))
  try {
    const result = await fetchGithubVersion({ owner: 'wha7ev9r', repo: 'dsh-kit' }, options, new SourceHealth(), undefined)
    check(result.version === undefined && result.notFound === true, 'every GitHub method failing reports not-found')
  } finally {
    restore()
  }
}
//#endregion

if (failures.length) {
  console.error(`sources.test: ${failures.length} failure(s)`)
  process.exitCode = 1
} else {
  console.log('sources.test: passed')
}

// Keep the unused import intentional: OFFICIAL_NPM_REGISTRY documents the
// public source set even when a case above uses the descriptor directly.
void OFFICIAL_NPM_REGISTRY
