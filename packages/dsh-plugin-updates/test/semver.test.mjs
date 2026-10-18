// SemVer precedence checks for the update checker.
//
// The module is small on purpose: the checker compares concrete published
// versions and never resolves a range. These cases pin the prerelease ordering
// that decides whether a release line (official `next`, a beta tag) counts as
// newer than the installed version.
import { compareVersions, isPrerelease, maxVersion, parseVersion } from '../lib/semver.js'

const failures = []
const check = (condition, message) => {
  if (!condition) failures.push(message)
  console.log(`${condition ? 'ok  ' : 'FAIL'}  ${message}`)
}

check(parseVersion('1.2.3')?.major === 1, 'parseVersion reads the major number')
check(parseVersion('v1.2.3-rc.1')?.prerelease.join('.') === 'rc.1', 'parseVersion accepts a v prefix and prerelease')
check(parseVersion('not-a-version') === undefined, 'parseVersion rejects malformed input')
check(parseVersion('1.2.3+build.7')?.patch === 3, 'parseVersion ignores build metadata')

check(compareVersions('1.0.0', '1.0.1') < 0, 'patch increases compare older')
check(compareVersions('1.2.0', '1.10.0') < 0, 'minor compares numerically')
check(compareVersions('2.0.0', '1.99.99') > 0, 'major dominates')
check(compareVersions('1.0.0', '1.0.0') === 0, 'equal versions compare equal')

check(compareVersions('1.0.0-rc.1', '1.0.0') < 0, 'prerelease is older than release')
check(compareVersions('1.0.0-alpha', '1.0.0-beta') < 0, 'alphabetic prerelease identifiers compare')
check(compareVersions('1.0.0-alpha.2', '1.0.0-alpha.10') < 0, 'numeric prerelease identifiers compare numerically')
check(compareVersions('1.0.0-alpha', '1.0.0-alpha.1') < 0, 'a shorter prerelease is older')
check(compareVersions('1.0.0-1', '1.0.0-alpha') < 0, 'numeric identifier sorts before alphabetic')
check(compareVersions('1.0.0+build.1', '1.0.0+build.2') === 0, 'build metadata does not affect precedence')

check(isPrerelease('1.0.0-rc.1'), 'isPrerelease detects a suffix')
check(!isPrerelease('1.0.0'), 'isPrerelease rejects a stable version')
check(!isPrerelease('bad'), 'isPrerelease rejects malformed input')

check(maxVersion(['1.0.0', '1.2.0', '1.1.0']) === '1.2.0', 'maxVersion picks the highest stable version')
check(maxVersion(['1.0.0', '1.0.0-rc.1']) === '1.0.0', 'maxVersion keeps a release above its own prerelease')
check(maxVersion(['1.0.0', '1.1.0-rc.1']) === '1.1.0-rc.1', 'maxVersion accepts a prerelease of a newer core')
check(maxVersion(['2.0.0-rc.2', '2.0.0-rc.10']) === '2.0.0-rc.10', 'maxVersion compares prerelease numbers')
check(maxVersion([]) === undefined, 'maxVersion returns undefined for an empty list')
check(maxVersion(['bad', '1.0.0']) === '1.0.0', 'maxVersion skips malformed versions')

if (failures.length) {
  console.error(`semver.test: ${failures.length} failure(s)`)
  process.exitCode = 1
} else {
  console.log('semver.test: passed')
}
