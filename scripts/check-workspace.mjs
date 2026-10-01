import { readFile, readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const packagesRoot = join(root, 'packages')
const failures = []

// Runtime dependencies allowed in public packages, kept explicit and minimal.
// TS-built host plugins may need schemastery for their plugin Config schema.
const allowedDependencies = new Set(['@deepseek-ai/schemastery'])

function check(condition, message) {
  if (!condition) failures.push(message)
}

function scanText(text, relative) {
  check(!/[A-Za-z]:\\Users\\/i.test(text), `${relative}: contains a local Windows user path`)
  check(!/\/(?:home|Users)\/[^\s'"`]+\//.test(text), `${relative}: contains a local Unix home path`)
  check(!/(?:sk|pk)-[A-Za-z0-9]{20,}/.test(text), `${relative}: looks like a credential`)
  check(!/(?:api[_-]?key|secret|password|token)\s*[:=]\s*['"][^$<{][^'"]{8,}/i.test(text), `${relative}: looks like a hard-coded secret`)
}

function relativePath(file) {
  return file.slice(root.length + 1)
}

async function walkFiles(directory, extensions) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true }).catch(() => [])) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walkFiles(path, extensions))
    else if (extensions.some((extension) => entry.name.endsWith(extension))) files.push(path)
  }
  return files
}

async function checkSourceFile(file) {
  const text = await readFile(file, 'utf8')
  const relative = relativePath(file)
  scanText(text, relative)

  if (file.endsWith('client.js')) {
    try {
      // Parse without executing browser-only code.
      new Function(text)
    } catch (error) {
      failures.push(`${relative}: client syntax error: ${error.message}`)
    }
  } else if (file.endsWith('.js')) {
    try {
      await import(pathToFileURL(file).href)
    } catch (error) {
      failures.push(`${relative}: module import failed: ${error.message}`)
    }
  }
}

function assertPackageShape(manifest, packageDir) {
  const name = manifest.name || '<missing name>'
  const hasClient = manifest.dsh?.client !== undefined
  check(typeof name === 'string' && name.startsWith('@wha7ever/'), `${packageDir}: name must use the @wha7ever scope`)
  check(manifest.private !== true, `${packageDir}: private packages cannot be published`)
  check(manifest.version && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.version), `${packageDir}: invalid semver`)
  check(manifest.license === 'MIT', `${packageDir}: license must be MIT`)
  check(manifest.repository?.type === 'git', `${packageDir}: repository metadata is required`)
  check(manifest.publishConfig?.access === 'public', `${packageDir}: publishConfig.access must be public`)
  check(manifest.dsh?.bundle?.patch === './cordis.patch.yml', `${packageDir}: dsh.bundle.patch is required`)
  check(Array.isArray(manifest.files) && manifest.files.includes('cordis.patch.yml'), `${packageDir}: cordis.patch.yml must be packed`)

  if (hasClient) {
    check(manifest.icon === './icon.svg', `${packageDir}: icon metadata is required for client plugins`)
    check(manifest.dsh?.client?.platform === 'web', `${packageDir}: web client metadata is required`)
    check(manifest.exports?.['./client'] === './lib/client.js', `${packageDir}: ./client export is required`)
  }

  for (const [dependency, specifier] of Object.entries(manifest.dependencies || {})) {
    check(allowedDependencies.has(dependency), `${packageDir}: runtime dependency ${dependency} is not on the allowlist`)
    check(!String(specifier).startsWith('file:'), `${packageDir}: dependency ${dependency} must not be a local file path`)
  }
}

const entries = await readdir(packagesRoot, { withFileTypes: true })
for (const entry of entries) {
  if (!entry.isDirectory()) continue
  const packageDir = join(packagesRoot, entry.name)
  const manifestPath = join(packageDir, 'package.json')
  let manifest
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  } catch (error) {
    failures.push(`${manifestPath}: cannot read package.json: ${error.message}`)
    continue
  }

  assertPackageShape(manifest, packageDir)
  const hasClient = manifest.dsh?.client !== undefined

  const patchPath = join(packageDir, 'cordis.patch.yml')
  const patch = await readFile(patchPath, 'utf8').catch((error) => {
    failures.push(`${patchPath}: cannot read patch: ${error.message}`)
    return ''
  })
  check(patch.includes(`name: '${manifest.name}'`), `${packageDir}: patch must insert its scoped package name`)

  const requiredFiles = ['README.md', 'LICENSE']
  if (hasClient) requiredFiles.push('icon.svg', 'locale/en.json', 'locale/zh.json')
  for (const required of requiredFiles) {
    await readFile(join(packageDir, required), 'utf8').catch(() => failures.push(`${packageDir}: missing ${required}`))
  }

  if (hasClient) {
    const clientPath = join(packageDir, 'lib', 'client.js')
    const client = await readFile(clientPath, 'utf8').catch((error) => {
      failures.push(`${clientPath}: cannot read client: ${error.message}`)
      return ''
    })
    const clientId = client.match(/\bid:\s*['"]([^'"]+)['"]/)?.[1]
    check(clientId === manifest.name, `${packageDir}: client module id must equal package name`)
  }

  if (typeof manifest.scripts?.build === 'string') {
    // TypeScript workspaces build lib/ at publish time; scan sources without executing them.
    for (const file of await walkFiles(join(packageDir, 'src'), ['.ts'])) {
      scanText(await readFile(file, 'utf8'), relativePath(file))
    }
    for (const file of await walkFiles(join(packageDir, 'scripts'), ['.mjs'])) {
      scanText(await readFile(file, 'utf8'), relativePath(file))
    }
  } else {
    const sourceDir = join(packageDir, 'lib')
    for (const source of await readdir(sourceDir, { withFileTypes: true })) {
      if (source.isFile() && source.name.endsWith('.js')) {
        await checkSourceFile(join(sourceDir, source.name))
      }
    }
  }
  await checkSourceFile(patchPath)
}

if (failures.length) {
  console.error(`check-workspace: ${failures.length} failure(s)`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log(`check-workspace: ${entries.filter((entry) => entry.isDirectory()).length} package(s) passed`)
}
