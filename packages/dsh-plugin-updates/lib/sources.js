/**
 * Metadata sources for the update checker.
 *
 * The module is deliberately dependency-free and works in the Host process:
 * plain `fetch`, strict URL construction, and a small circuit breaker. A
 * source that keeps failing is skipped for a while instead of costing one
 * timeout per package on every sweep.
 *
 * @module @wha7ever/dsh-plugin-updates/sources
 */

import { compareVersions, isPrerelease, maxVersion } from './semver.js'

/** npm's own registry: the one public registry a source plan trusts as such. */
export const OFFICIAL_NPM_REGISTRY = 'https://registry.npmjs.org/'
/** Public npmmirror registry: the fast mirror DSH already falls back to. */
export const NPMMIRROR_REGISTRY = 'https://registry.npmmirror.com/'
/** Tencent Cloud npm mirror: a second mainland mirror. */
export const TENCENT_REGISTRY = 'https://mirrors.cloud.tencent.com/npm/'
/** Huawei Cloud npm mirror: kept as an optional fallback. */
export const HUAWEI_REGISTRY = 'https://repo.huaweicloud.com/repository/npm/'
/** Largest accepted JSON response. */
const MAX_BYTES = 2 * 1024 * 1024
/** npm's package-name grammar, copied from DSH's install-spec parser. */
const PACKAGE_NAME = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/
const GIT_SHORTHAND = /^(?:github|gitlab|bitbucket|gist):/i
const GIT_URL = /^git(?:\+[a-z]+)?:\/\/|^git@[^:]+:/i
const HOSTED_REPOSITORY_URL = /^https?:\/\/[^/]+\/[^/]+\/[^/#]+(?:\.git)?(?:#.*)?$/i

/**
 * One metadata source the checker may ask.
 *
 * `registry` sources accept a `<registry><name>/<tag>` dist-tag manifest;
 * `jsdelivr` and `npmx` answer the same question from their own endpoints.
 */
export const PUBLIC_SOURCES = {
  npmmirror: { id: 'npmmirror', kind: 'registry', url: NPMMIRROR_REGISTRY, supportsPackument: true },
  npmjs: { id: 'npmjs', kind: 'registry', url: OFFICIAL_NPM_REGISTRY, supportsPackument: true },
  tencent: { id: 'tencent', kind: 'registry', url: TENCENT_REGISTRY, supportsPackument: true },
  huawei: { id: 'huawei', kind: 'registry', url: HUAWEI_REGISTRY, supportsPackument: true },
  jsdelivr: { id: 'jsdelivr', kind: 'jsdelivr', supportsPackument: false },
  npmx: { id: 'npmx', kind: 'npmx', supportsPackument: true },
}

/** A source could not answer: the kind decides whether another source helps. */
export class SourceFailure extends Error {
  /**
   * @param {string} source - source id or URL that failed.
   * @param {'network'|'timeout'|'http'|'invalid'|'too-large'|'not-found'|'auth'} kind - failure class.
   * @param {string} message - human-readable diagnostic.
   */
  constructor(source, kind, message) {
    super(message)
    this.name = 'SourceFailure'
    this.source = source
    this.kind = kind
  }
}

/** @param {unknown} error @returns {string} a printable message. */
export function messageOf(error) {
  if (error instanceof Error) return error.message
  return String(error)
}

/**
 * Normalize a registry URL to the form the plan compares.
 * @param {unknown} value - candidate URL.
 * @returns {string | undefined} lower-case http(s) URL with a trailing slash, or undefined.
 */
export function normalizeRegistry(value) {
  if (typeof value !== 'string' || value.trim() === '') return undefined
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
    if (url.username !== '' || url.password !== '') return undefined
    url.search = ''
    url.hash = ''
    if (!url.pathname.endsWith('/')) url.pathname += '/'
    return url.href
  } catch {
    return undefined
  }
}

/**
 * Whether a URL is one of the known public npm registries.
 * @param {string | undefined} url - normalized or raw URL.
 * @returns {boolean} true for npmjs, npmmirror, Tencent, or Huawei.
 */
function isKnownPublic(url) {
  if (url === undefined) return false
  return [OFFICIAL_NPM_REGISTRY, NPMMIRROR_REGISTRY, TENCENT_REGISTRY, HUAWEI_REGISTRY].includes(url)
}

/**
 * Source id for a registry URL: a stable name for the UI and the health table.
 * @param {string} url - normalized registry URL.
 * @returns {string} `npmmirror`, `npmjs`, `tencent`, `huawei`, or the host.
 */
function sourceIdForUrl(url) {
  if (url === NPMMIRROR_REGISTRY) return 'npmmirror'
  if (url === OFFICIAL_NPM_REGISTRY) return 'npmjs'
  if (url === TENCENT_REGISTRY) return 'tencent'
  if (url === HUAWEI_REGISTRY) return 'huawei'
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

/**
 * Build the ordered source plan for one sweep.
 *
 * The DSH manager's own registries come first, so the configured registry and
 * its configured fallbacks keep their meaning. A registry pnpm names itself is
 * asked alone while it is private. Only a plan with a known public registry
 * gets the public fallbacks, so a private package name never leaks.
 *
 * @param {{ registry?: string | null, fallbackRegistries?: readonly string[], resolved?: string | null } | null} registries - `pluginManager.registries()`.
 * @param {{ registryOverride?: string, fallbackSources?: readonly string[] }} [options] - checker options.
 * @returns {Array<{ id: string, kind: 'registry'|'jsdelivr'|'npmx', url?: string, supportsPackument: boolean }>} ordered sources.
 */
export function buildRegistryPlan(registries, options = {}) {
  const configured = registries ?? {}
  const requestedFallbacks = Array.isArray(options.fallbackSources)
    ? options.fallbackSources
    : ['npmjs', 'tencent', 'jsdelivr', 'npmx']
  const plan = []
  const seen = new Set()
  const add = (source) => {
    if (source === undefined || source === null || seen.has(source.id)) return
    seen.add(source.id)
    plan.push(source)
  }
  const addRegistry = (value) => {
    const url = normalizeRegistry(value)
    if (url === undefined) return undefined
    add({ id: sourceIdForUrl(url), kind: 'registry', url, supportsPackument: true })
    return url
  }

  const override = normalizeRegistry(options.registryOverride)
  let privateOnly = false
  if (override !== undefined) {
    addRegistry(override)
    privateOnly = !isKnownPublic(override)
  } else {
    const first = normalizeRegistry(configured.registry)
    const fallbacks = (configured.fallbackRegistries ?? []).map(normalizeRegistry).filter((url) => url !== undefined)
    const resolved = normalizeRegistry(configured.resolved)
    if (first !== undefined) {
      addRegistry(first)
      for (const url of fallbacks) addRegistry(url)
      privateOnly = !isKnownPublic(first) && !fallbacks.some((url) => isKnownPublic(url))
    } else if (resolved !== undefined) {
      const resolvedIsPublic = isKnownPublic(resolved) || fallbacks.includes(resolved)
      addRegistry(resolved)
      if (resolvedIsPublic) for (const url of fallbacks) addRegistry(url)
      else privateOnly = true
    } else {
      // No configured registry and no pnpm answer: keep the mainland mirror
      // first, then npm's own registry.
      addRegistry(NPMMIRROR_REGISTRY)
      addRegistry(OFFICIAL_NPM_REGISTRY)
    }
  }

  if (!privateOnly) {
    for (const name of requestedFallbacks) {
      const descriptor = PUBLIC_SOURCES[name]
      if (descriptor !== undefined) add(descriptor)
    }
  }
  if (plan.length === 0) add(PUBLIC_SOURCES.npmjs)
  return plan
}

/** Track source failures so a dead source is skipped for a while. */
export class SourceHealth {
  /**
   * @param {{ failures?: number, cooldownMs?: number }} [options] - failure threshold and cooldown.
   */
  constructor(options = {}) {
    this.failures = Number.isInteger(options.failures) && options.failures > 0 ? options.failures : 2
    this.cooldownMs = Number.isFinite(options.cooldownMs) && options.cooldownMs > 0 ? options.cooldownMs : 10 * 60 * 1000
    this.records = new Map()
  }

  /** @param {string} id @returns {boolean} whether the source may be asked now. */
  available(id) {
    const record = this.records.get(id)
    return record === undefined || record.cooldownUntil <= Date.now()
  }

  /** @param {string} id - a source that answered. */
  succeed(id) {
    this.records.delete(id)
  }

  /** @param {string} id - a source that failed with a retryable error. */
  fail(id) {
    const record = this.records.get(id) ?? { failures: 0, cooldownUntil: 0 }
    record.failures += 1
    if (record.failures >= this.failures) {
      record.failures = 0
      record.cooldownUntil = Date.now() + this.cooldownMs
    }
    this.records.set(id, record)
  }

  /** @param {string} id - a source that asked for credentials; skip it for an hour. */
  auth(id) {
    this.records.set(id, { failures: 0, cooldownUntil: Date.now() + 60 * 60 * 1000, auth: true })
  }

  /** Forget every cooldown, as a manual check does. */
  reset() {
    this.records.clear()
  }

  /** @returns {string[]} sources currently waiting on credentials. */
  authSources() {
    return [...this.records.entries()].filter(([, record]) => record.auth === true).map(([id]) => id)
  }

  /** @returns {string[]} sources currently in cooldown. */
  unavailable() {
    const now = Date.now()
    return [...this.records.entries()].filter(([, record]) => record.cooldownUntil > now).map(([id]) => id)
  }
}

/**
 * Read one JSON document with a bounded deadline and body.
 * @param {string} url - exact URL to ask.
 * @param {{ timeoutMs: number, signal?: AbortSignal, headers?: Record<string,string>, redirect?: RequestRedirect }} options - request policy.
 * @returns {Promise<any>} parsed JSON.
 * @throws {SourceFailure} with a classified reason.
 */
async function fetchJson(url, options) {
  const timeout = AbortSignal.timeout(options.timeoutMs)
  const signal = options.signal === undefined ? timeout : AbortSignal.any([options.signal, timeout])
  let response
  try {
    response = await fetch(url, {
      signal,
      redirect: options.redirect ?? 'error',
      headers: {
        accept: 'application/json',
        'user-agent': 'dsh-plugin-updates/0.1.0',
        ...options.headers,
      },
    })
  } catch (error) {
    const kind = error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'timeout' : 'network'
    throw new SourceFailure(url, kind, messageOf(error))
  }
  let text
  try {
    text = await response.text()
  } catch (error) {
    throw new SourceFailure(url, 'network', messageOf(error))
  }
  if (text.length > MAX_BYTES) throw new SourceFailure(url, 'too-large', `response exceeds ${MAX_BYTES} bytes`)
  if (!response.ok) {
    if (response.status === 404 || response.status === 410) throw new SourceFailure(url, 'not-found', `HTTP ${response.status}`)
    if (response.status === 401 || response.status === 403) throw new SourceFailure(url, 'auth', `HTTP ${response.status}`)
    throw new SourceFailure(url, 'http', `HTTP ${response.status}`)
  }
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new SourceFailure(url, 'invalid', `unreadable JSON: ${messageOf(error)}`)
  }
}

/** @param {string} name @returns {string} the registry path form of a package name. */
export function encodePackageName(name) {
  return encodeURIComponent(name).replace('%40', '@')
}

/**
 * Extract the package version from a dist-tag manifest or npmx packument.
 * @param {any} json - parsed source response.
 * @param {string} channel - requested dist-tag.
 * @returns {string | undefined} the version the tag names.
 */
function versionFromTagResponse(json, channel) {
  if (typeof json?.version === 'string') return json.version
  const tags = json?.['dist-tags']
  if (tags !== null && typeof tags === 'object' && typeof tags[channel] === 'string') return tags[channel]
  return undefined
}

/**
 * Ask one source for one dist-tag manifest.
 * @param {string} name - package name.
 * @param {string} channel - dist-tag, such as `latest` or `next`.
 * @param {{ id: string, kind: 'registry'|'jsdelivr'|'npmx', url?: string }} source - source descriptor.
 * @param {{ requestTimeoutMs: number }} options - request policy.
 * @param {AbortSignal | undefined} signal - caller cancellation.
 * @returns {Promise<string>} the version the tag names.
 * @throws {SourceFailure} when the source cannot answer.
 */
async function fetchTagOnce(name, channel, source, options, signal) {
  if (source.kind === 'registry') {
    const url = `${source.url}${encodePackageName(name)}/${encodeURIComponent(channel)}`
    const json = await fetchJson(url, { timeoutMs: options.requestTimeoutMs, signal })
    const version = versionFromTagResponse(json, channel)
    if (version === undefined) throw new SourceFailure(url, 'invalid', 'tag response has no version')
    return version
  }
  if (source.kind === 'jsdelivr') {
    const url = `https://cdn.jsdelivr.net/npm/${name}@${encodeURIComponent(channel)}/package.json`
    const json = await fetchJson(url, { timeoutMs: options.requestTimeoutMs, signal })
    const version = versionFromTagResponse(json, channel)
    if (version === undefined) throw new SourceFailure(url, 'invalid', 'package.json has no version')
    return version
  }
  if (source.kind === 'npmx') {
    const url = `https://npmx.dev/api/registry/packument/${name}?version=${encodeURIComponent(channel)}`
    const json = await fetchJson(url, { timeoutMs: options.requestTimeoutMs, signal })
    const tags = json?.['dist-tags']
    const version = tags !== null && typeof tags === 'object' && typeof tags[channel] === 'string'
      ? tags[channel]
      : channel === 'latest' && typeof json?.requestedVersion === 'string'
        ? json.requestedVersion
        : undefined
    if (version === undefined) throw new SourceFailure(url, 'not-found', `no ${channel} tag`)
    return version
  }
  throw new SourceFailure(source.id, 'invalid', 'unsupported source')
}

/**
 * Ask one source for every published version.
 * @param {string} name - package name.
 * @param {{ id: string, kind: string, url?: string }} source - source descriptor.
 * @param {{ requestTimeoutMs: number }} options - request policy.
 * @param {AbortSignal | undefined} signal - caller cancellation.
 * @returns {Promise<string[]>} published versions.
 * @throws {SourceFailure} when the source cannot answer.
 */
async function fetchPackumentVersions(name, source, options, signal) {
  const url = source.kind === 'npmx'
    ? `https://npmx.dev/api/registry/packument/${name}?version=latest`
    : `${source.url}${encodePackageName(name)}`
  const json = await fetchJson(url, {
    timeoutMs: options.requestTimeoutMs,
    signal,
    headers: { accept: 'application/vnd.npm.install-v1+json' },
  })
  const versions = json?.versions
  if (versions === null || typeof versions !== 'object') throw new SourceFailure(url, 'invalid', 'packument has no versions')
  return Object.keys(versions)
}

/**
 * Find the target version for a package from the ordered sources.
 *
 * Each source is asked for each channel in order; a 404 advances to the next
 * channel or source, while a network failure demotes the source and moves on.
 * A packument fallback covers a tag the registry no longer carries.
 *
 * @param {string} name - package name.
 * @param {string[]} channels - dist-tags to ask, in order.
 * @param {Array<{ id: string, kind: 'registry'|'jsdelivr'|'npmx', url?: string, supportsPackument: boolean }>} plan - ordered sources.
 * @param {{ requestTimeoutMs: number }} options - request policy.
 * @param {SourceHealth} health - circuit breaker.
 * @param {AbortSignal | undefined} signal - caller cancellation.
 * @returns {Promise<{ version?: string, channel?: string | null, source?: string, auth?: boolean, error?: Error, notFound?: boolean }>} the answer.
 */
export async function fetchTagVersion(name, channels, plan, options, health, signal) {
  const list = Array.isArray(channels) && channels.length > 0 ? channels : ['latest']
  let lastError
  let sawNotFound = false
  for (const source of plan) {
    if (!health.available(source.id)) continue
    let sourceFailed = false
    for (const channel of list) {
      try {
        const version = await fetchTagOnce(name, channel, source, options, signal)
        health.succeed(source.id)
        return { version, channel, source: source.id }
      } catch (error) {
        if (error.kind === 'not-found') {
          sawNotFound = true
          continue
        }
        if (error.kind === 'auth') {
          health.auth(source.id)
          return { auth: true, source: source.id }
        }
        health.fail(source.id)
        lastError = error
        sourceFailed = true
        break
      }
    }
    if (sourceFailed) continue
  }

  for (const source of plan) {
    if (!source.supportsPackument || !health.available(source.id)) continue
    try {
      const versions = await fetchPackumentVersions(name, source, options, signal)
      health.succeed(source.id)
      const allowPrerelease = list.includes('next')
      const target = maxVersion(versions.filter((version) => allowPrerelease || !isPrerelease(version)))
      if (target !== undefined) return { version: target, channel: null, source: source.id }
      sawNotFound = true
    } catch (error) {
      if (error.kind === 'not-found') {
        sawNotFound = true
        continue
      }
      if (error.kind === 'auth') {
        health.auth(source.id)
        return { auth: true, source: source.id }
      }
      health.fail(source.id)
      lastError = error
    }
  }
  return { error: lastError, notFound: sawNotFound }
}

/**
 * Read every channel the running release line offers, then take the greatest.
 *
 * Used for the official DSH package, where a prerelease install must consider
 * both `next` and `latest` instead of stopping at the first successful tag.
 *
 * @param {string} name - package name.
 * @param {string[]} channels - dist-tags to ask.
 * @param {Array<{ id: string, kind: 'registry'|'jsdelivr'|'npmx', url?: string, supportsPackument: boolean }>} plan - ordered sources.
 * @param {{ requestTimeoutMs: number }} options - request policy.
 * @param {SourceHealth} health - circuit breaker.
 * @param {AbortSignal | undefined} signal - caller cancellation.
 * @returns {Promise<{ version?: string, channel?: string, source?: string, auth?: boolean, error?: Error }>} the greatest answer.
 */
export async function fetchOfficialVersion(name, channels, plan, options, health, signal) {
  const list = Array.isArray(channels) && channels.length > 0 ? channels : ['latest']
  let lastError
  let authSource
  for (const source of plan) {
    if (!health.available(source.id)) continue
    const found = []
    let sourceFailed = false
    for (const channel of list) {
      try {
        const version = await fetchTagOnce(name, channel, source, options, signal)
        found.push({ version, channel, source: source.id })
      } catch (error) {
        if (error.kind === 'not-found') continue
        if (error.kind === 'auth') {
          health.auth(source.id)
          authSource = source.id
          sourceFailed = true
          break
        }
        health.fail(source.id)
        lastError = error
        sourceFailed = true
        break
      }
    }
    if (found.length > 0) {
      health.succeed(source.id)
      return found.reduce((best, item) => compareVersions(item.version, best.version) > 0 ? item : best)
    }
    if (sourceFailed && authSource !== undefined) break
  }
  if (authSource !== undefined) return { auth: true, source: authSource }
  return { error: lastError }
}

/**
 * Parse a recorded dependency value into what the checker can ask.
 * @param {string} name - bundle package name.
 * @param {string | null | undefined} source - `BundleInfo.source`.
 * @returns {{ kind: 'registry'|'git'|'local'|'tarball'|'unknown', recorded?: string, tag?: string | null, exact?: boolean, range?: boolean, git?: ReturnType<typeof parseGithubSource>, reason?: string }} the parsed source.
 */
export function parseSource(name, source) {
  if (typeof name !== 'string' || !PACKAGE_NAME.test(name)) return { kind: 'unknown', reason: 'invalid-name' }
  if (typeof source !== 'string' || source.trim() === '') return { kind: 'unknown', reason: 'no-source' }
  const value = source.trim()
  if (/^(file|link):/i.test(value) || /^[A-Za-z]:[\\/]/.test(value) || value.startsWith('/')) return { kind: 'local' }
  if (/\.(?:tgz|tar\.gz)(?:#.*)?$/i.test(value)) return { kind: 'tarball' }
  if (GIT_SHORTHAND.test(value) || GIT_URL.test(value) || HOSTED_REPOSITORY_URL.test(value)) {
    return { kind: 'git', recorded: value, git: parseGithubSource(value) }
  }
  if (value === name) return { kind: 'registry', recorded: 'latest', tag: 'latest', exact: false, range: false }
  if (value.startsWith(`${name}@`)) {
    const recorded = value.slice(name.length + 1)
    if (recorded === '') return { kind: 'unknown', reason: 'invalid' }
    if (/^(?:npm|jsr|workspace|catalog):/i.test(recorded)) return { kind: 'unknown', reason: 'alias' }
    if (/^[0-9]+\.[0-9]+\.[0-9]+/.test(recorded)) return { kind: 'registry', recorded, tag: null, exact: true, range: false }
    if (/[~^*<>=| ]|\.x(?:\.|$)/i.test(recorded)) return { kind: 'registry', recorded, tag: null, exact: false, range: true }
    return { kind: 'registry', recorded, tag: recorded, exact: false, range: false }
  }
  return { kind: 'unknown', reason: 'unrecognized' }
}

/**
 * Parse a GitHub install spec, including pnpm's `#path:` subdirectory form.
 * @param {string} value - recorded git spec.
 * @returns {{ owner: string, repo: string, ref?: string, path?: string } | undefined} the repository coordinates.
 */
export function parseGithubSource(value) {
  let text = value.trim()
  let ref
  let path
  const hash = text.indexOf('#')
  if (hash !== -1) {
    const fragment = text.slice(hash + 1)
    text = text.slice(0, hash)
    const pathMatch = /(?:^|&)path:([^&]+)/i.exec(fragment)
    if (pathMatch !== null) {
      try {
        path = decodeURIComponent(pathMatch[1]).replace(/^\/+|\/+$/g, '')
      } catch {
        path = pathMatch[1].replace(/^\/+|\/+$/g, '')
      }
      const refPart = fragment.split('&').filter((part) => !part.startsWith('path:'))[0]
      if (refPart !== undefined && refPart !== '') {
        try {
          ref = decodeURIComponent(refPart)
        } catch {
          ref = refPart
        }
      }
    } else if (fragment !== '' && !fragment.includes('=')) {
      try {
        ref = decodeURIComponent(fragment)
      } catch {
        ref = fragment
      }
    }
  }
  let owner
  let repo
  let match = /^github:([^/]+)\/([^/#]+?)(?:\.git)?$/i.exec(text)
  if (match !== null) {
    owner = match[1]
    repo = match[2]
  } else if ((match = /^git@github\.com:([^/]+)\/([^/#]+?)(?:\.git)?$/i.exec(text)) !== null) {
    owner = match[1]
    repo = match[2]
  } else if ((match = /^(?:git\+)?https?:\/\/github\.com\/([^/]+)\/([^/#]+?)(?:\.git)?$/i.exec(text)) !== null) {
    owner = match[1]
    repo = match[2]
  }
  if (owner === undefined || repo === undefined) return undefined
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) return undefined
  if (path !== undefined && path.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')) return undefined
  return { owner, repo, ...(ref === undefined ? {} : { ref }), ...(path === undefined ? {} : { path }) }
}

/**
 * Remove user information from a recorded source before showing it.
 * @param {string | null | undefined} source - recorded spec.
 * @returns {string | null} a display-safe spec.
 */
export function sanitizeSource(source) {
  if (typeof source !== 'string' || source === '') return null
  return source.replace(/^(git\+)?(https?:\/\/)[^/]*@/i, '$1$2')
}

/**
 * Read the version a GitHub repository's package.json declares.
 *
 * `raw.githubusercontent.com` comes first; jsDelivr's GitHub CDN and the
 * `github.com/.../raw/...` redirect are fallbacks. A failed method is cooled
 * down independently, so an unreachable jsDelivr never slows the next sweep.
 *
 * @param {{ owner: string, repo: string, ref?: string, path?: string }} git - parsed coordinates.
 * @param {{ githubTimeoutMs?: number, githubProxy?: string }} options - request policy.
 * @param {SourceHealth} health - circuit breaker.
 * @param {AbortSignal | undefined} signal - caller cancellation.
 * @returns {Promise<{ version?: string, checkedFrom?: string, error?: Error, notFound?: boolean }>} the answer.
 */
export async function fetchGithubVersion(git, options, health, signal) {
  const ref = git.ref ?? 'HEAD'
  const prefix = git.path === undefined ? '' : `${git.path.replace(/^\/+|\/+$/g, '')}/`
  const encodedPrefix = prefix.split('/').map(encodeURIComponent).join('/')
  const raw = `https://raw.githubusercontent.com/${git.owner}/${git.repo}/${encodeURIComponent(ref)}/${encodedPrefix}package.json`
  const attempts = [{ id: 'github-raw', url: raw, redirect: 'error' }]
  for (const jsdelivrRef of ref === 'HEAD' ? ['HEAD', 'main', 'master'] : [ref]) {
    attempts.push({
      id: 'github-jsdelivr',
      url: `https://cdn.jsdelivr.net/gh/${git.owner}/${git.repo}@${encodeURIComponent(jsdelivrRef)}/${encodedPrefix}package.json`,
      redirect: 'error',
    })
  }
  attempts.push({
    id: 'github',
    url: `https://github.com/${git.owner}/${git.repo}/raw/${encodeURIComponent(ref)}/${encodedPrefix}package.json`,
    redirect: 'follow',
  })
  const proxy = typeof options.githubProxy === 'string' ? options.githubProxy.trim() : ''
  if (proxy !== '') attempts.push({ id: 'github-proxy', url: `${proxy}${raw}`, redirect: 'error' })

  let lastError
  let sawNotFound = false
  for (const attempt of attempts) {
    if (!health.available(attempt.id)) continue
    try {
      const json = await fetchJson(attempt.url, {
        timeoutMs: options.githubTimeoutMs ?? 2500,
        signal,
        redirect: attempt.redirect,
      })
      const version = typeof json?.version === 'string' ? json.version : undefined
      if (version === undefined) throw new SourceFailure(attempt.url, 'invalid', 'package.json has no version')
      health.succeed(attempt.id)
      return { version, checkedFrom: attempt.id }
    } catch (error) {
      if (error.kind === 'not-found') {
        sawNotFound = true
        continue
      }
      if (error.kind === 'auth') {
        health.auth(attempt.id)
        continue
      }
      health.fail(attempt.id)
      lastError = error
    }
  }
  return { error: lastError, notFound: sawNotFound }
}
