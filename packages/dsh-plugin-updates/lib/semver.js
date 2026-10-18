/**
 * Minimal SemVer 2.0.0 precedence comparison used by the update checker.
 *
 * The checker only compares concrete published versions and never resolves a
 * range, so this module deliberately stays smaller than a full semver package:
 * no range parser, no coercion, no `v` prefix normalisation beyond acceptance.
 *
 * @module @wha7ever/dsh-plugin-updates/semver
 */

/** One parsed version: numeric core, then prerelease identifiers. */
const VERSION = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/

/**
 * Parse a concrete version.
 * @param {unknown} value - candidate text.
 * @returns {{ major: number, minor: number, patch: number, prerelease: string[] } | undefined} the parsed form, or undefined.
 */
export function parseVersion(value) {
  if (typeof value !== 'string') return undefined
  const match = VERSION.exec(value.trim())
  if (match === null) return undefined
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] === undefined ? [] : match[4].split('.'),
  }
}

/**
 * Whether a concrete version carries a prerelease suffix.
 * @param {unknown} value - candidate text.
 * @returns {boolean} true for `1.0.0-rc.1`, false for `1.0.0` and invalid input.
 */
export function isPrerelease(value) {
  const parsed = parseVersion(value)
  return parsed !== undefined && parsed.prerelease.length > 0
}

/**
 * Compare one prerelease identifier per SemVer 2.0.0.
 * @param {string} left - left identifier.
 * @param {string} right - right identifier.
 * @returns {number} negative, zero, or positive.
 */
function compareIdentifier(left, right) {
  const leftNumeric = /^\d+$/.test(left)
  const rightNumeric = /^\d+$/.test(right)
  if (leftNumeric && rightNumeric) return Math.sign(Number(left) - Number(right))
  if (leftNumeric) return -1
  if (rightNumeric) return 1
  return left < right ? -1 : left > right ? 1 : 0
}

/**
 * Compare two concrete versions.
 * Invalid input compares equal to everything, which keeps a malformed registry
 * answer from producing a false update.
 * @param {unknown} left - left version.
 * @param {unknown} right - right version.
 * @returns {number} negative when left is older, positive when newer, zero when equal.
 */
export function compareVersions(left, right) {
  const a = parseVersion(left)
  const b = parseVersion(right)
  if (a === undefined || b === undefined) return 0
  for (const key of ['major', 'minor', 'patch']) {
    if (a[key] !== b[key]) return a[key] > b[key] ? 1 : -1
  }
  if (a.prerelease.length === 0 && b.prerelease.length === 0) return 0
  if (a.prerelease.length === 0) return 1
  if (b.prerelease.length === 0) return -1
  const length = Math.max(a.prerelease.length, b.prerelease.length)
  for (let index = 0; index < length; index++) {
    if (a.prerelease[index] === undefined) return -1
    if (b.prerelease[index] === undefined) return 1
    const order = compareIdentifier(a.prerelease[index], b.prerelease[index])
    if (order !== 0) return order
  }
  return 0
}

/**
 * Pick the greatest valid version from a list.
 * @param {Iterable<unknown>} versions - candidate versions.
 * @returns {string | undefined} the greatest version, or undefined when none parse.
 */
export function maxVersion(versions) {
  let best
  for (const version of versions) {
    if (parseVersion(version) === undefined) continue
    if (best === undefined || compareVersions(version, best) > 0) best = version
  }
  return best
}
