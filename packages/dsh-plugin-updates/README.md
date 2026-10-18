# @wha7ever/dsh-plugin-updates

A DeepSeek Harness bundle that checks the profile's installed plugins for newer npm or GitHub versions and reports them on the **Plugins** page. It is a reminder surface only: it never installs, removes, or enables a package.

## What it does

- After DSH starts, waits a few seconds and checks in the background. It does not block startup.
- Reads the installed bundles from `ctx.pluginManager.listBundles()`: third-party profile dependencies and the official bundles the installation ships.
- Asks dist-tag manifests first (`latest`, `next`, or the tag the profile recorded), then falls back across sources.
- Adds an **Updates** tab to the Web Plugins page, before **Discover**, plus an update badge and section on each bundle's detail page.
- Shows one official DSH release line: official bundles follow DSH, so they are not updated package by package.
- Keeps the last successful report in Host memory, so the page opens instantly and still shows something while a source is unavailable.

## Install

### npm

```powershell
dsh plugin --profile web add @wha7ever/dsh-plugin-updates@latest
```

The updater is installed from `latest` on purpose. It has no peer dependencies and its `engines.dsh` lower bound is open, so a new release does not require a compatibility edit. A profile that records an exact version still gets reminders, because the checker compares against the `latest` tag rather than the recorded range.

### GitHub (monorepo subdirectory)

This repository is a workspace, not a bundle at its root. The install spec must name the package directory:

```powershell
dsh plugin --profile web add "github:wha7ev9r/dsh-kit#path:packages/dsh-plugin-updates"
```

The same value can be pasted into **Plugins → Add plugin**:

```text
https://github.com/wha7ev9r/dsh-kit#path:packages/dsh-plugin-updates
```

pnpm supports the `#path:` subdirectory form since v9. The package has no dependencies, no peer dependencies, and no build script, so the git install does not resolve peers or run a build. Entering only `https://github.com/wha7ev9r/dsh-kit` fails: the repository root is not a bundle.

## Where the version data comes from

The checker uses the registry plan from `ctx.pluginManager.registries()` first, then these public fallbacks:

| Order | Source | Request |
| --- | --- | --- |
| 1 | configured registry / npmmirror | `GET <registry><name>/<tag>` |
| 2 | official npm | `GET https://registry.npmjs.org/<name>/<tag>` |
| 3 | Tencent Cloud | `GET https://mirrors.cloud.tencent.com/npm/<name>/<tag>` |
| 4 | jsDelivr CDN | `GET https://cdn.jsdelivr.net/npm/<name>@<tag>/package.json` |
| 5 | npmx | `GET https://npmx.dev/api/registry/packument/<name>?version=<tag>` |

- A private registry named by pnpm itself is asked alone; public fallbacks are not used for it.
- A source that fails twice is cooled down for 10 minutes. A manual **Check now** resets the cooldowns.
- Every source has a short timeout. A failed source moves the sweep to the next one instead of failing the page.
- npmx is a package browser, not a registry; its JSON endpoint is an internal API, so it is the last fallback and can be removed from `fallbackSources`.

Git-installed bundles are checked best-effort from the repository's package manifest:

1. `raw.githubusercontent.com`;
2. jsDelivr's GitHub CDN;
3. `github.com/.../raw/...`;
4. an optional `githubProxy` prefix.

If none answers, the row says the Git source cannot be checked automatically. An npm-installed plugin never depends on GitHub.

## Configuration

The row reads a plain config object. There is no Schemastery schema, so these fields are optional and documented here rather than edited in Settings. Put them in the profile's `cordis.patch.yml`:

```yaml
- id: plugin-updates
  config:
    startupDelayMs: 8000
    refreshIntervalMs: 21600000
    requestTimeoutMs: 3000
    fallbackSources: [npmjs, tencent, jsdelivr, npmx]
    packageLink: npmx
```

| Field | Default | Meaning |
| --- | --- | --- |
| `enabled` | `true` | Turn the background check off. |
| `startupDelayMs` | `8000` | Delay after start; `0` disables the startup sweep. |
| `refreshIntervalMs` | `21600000` | Successful-report TTL (6 hours). |
| `requestTimeoutMs` | `3000` | Per-source request timeout. |
| `githubTimeoutMs` | `2500` | Per-GitHub-method timeout. |
| `concurrency` | `4` | Concurrent package checks. |
| `fallbackSources` | `[npmjs, tencent, jsdelivr, npmx]` | Public sources after the configured registry. |
| `githubProxy` | empty | Optional prefix for raw GitHub requests. |
| `packageLink` | `npmx` | `npmx` or `npmjs` for the detail link. |
| `includeOfficial` | `true` | Check the official DSH release line. |
| `includeThirdParty` | `true` | Check profile-installed bundles. |
| `changeDebounceMs` | `1000` | Delay after a plugin-manager change. |
| `circuitBreakerFailures` | `2` | Failures before a source cools down. |
| `circuitBreakerCooldownMs` | `600000` | Cooldown length. |

## Updating

The plugin does not update anything by itself. DeepSeek Harness refuses to reinstall an already-installed bundle through its install dialog, and a remove-then-install sequence can leave a plugin uninstalled when the second step fails. The update surface therefore keeps the reminder and gives you a copyable command:

```powershell
dsh plugin --profile <profile> add "name@version"
```

For a Git source, the same command with the recorded spec reinstalls the branch. The bundle detail page also has the usual uninstall/reinstall controls.

Run the command, then restart DSH (or accept the restart prompt DSH shows). Respect pnpm's `minimumReleaseAge`: a very recent release may be held back, so the install dialog can report a version older than the one the checker saw.

## Security and privacy

- Only anonymous GET requests; the plugin never reads `.npmrc` tokens or credentials.
- Only URLs from the registry plan and the fixed GitHub/jsDelivr/npmx hosts are requested; the browser cannot pass an arbitrary URL.
- Package names are public data and are sent to the metadata sources, exactly as a pnpm install would.
- The report contains no tokens, credentials, or local absolute paths.
- The Client half has no install or remove endpoint. The only action is copying a command.

## Limitations

- No one-click or batch update.
- Official plugins update with DSH; the checker only reports the release line.
- Transitive dependencies and uninstalled official on-demand bundles are not checked.
- A private registry that requires authentication is reported as unable to check, not read with tokens.
- Git sources report the manifest version at the recorded ref; a same-version commit is not detected.
- The report cache is in memory; a restart triggers a fresh sweep.

## Verification

```powershell
bun run check
bun run test:updates
bun run audit
```

The tests cover SemVer precedence, the source fallback order, the circuit breaker, private-registry handling, the RPC envelope, the startup timer, and the Client registrations/rendering.

## License

[MIT](LICENSE)
