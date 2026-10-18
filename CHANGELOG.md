# Changelog

All notable changes to this project are documented here.

## Unreleased

- Add `@wha7ever/dsh-plugin-updates`: a lazy, read-only update checker for profile-installed third-party bundles and the official DSH release line. A new **Updates** tab on the Plugins page and a badge/section on each bundle's detail page report current → target versions; the plugin never installs, removes, or enables anything and instead offers the exact `dsh plugin ... add` command.
- The checker asks dist-tag manifests first (`<registry><name>/<tag>`) and falls back across the configured registry, npmjs, Tencent Cloud, jsDelivr's npm CDN, and npmx. A source that fails twice is cooled down for ten minutes; a manual check resets the cooldowns. GitHub-installed bundles are checked best-effort from `raw.githubusercontent.com`, jsDelivr's GitHub CDN, and `github.com/.../raw/...`, with an optional `githubProxy`.
- Add an `updates` choice to the publish workflow and a root `test:updates` script; register the new workspace in `bun.lock`.
- Document the monorepo subdirectory install: `dsh plugin --profile web add "github:wha7ev9r/dsh-kit#path:packages/dsh-plugin-updates"`. The repository root is a workspace, not a bundle, so the bare repository URL is not installable.
- Add `@wha7ever/dsh-gotify-notify`: Gotify push alerts on a harness question, an approval request, a finished turn, or a failed turn, with a settings page for the server, application credential, priority, title prefix, and per-trigger switches. The Host half reads its whole Config through `.volatile()` references, so a settings-page save reaches the next push without a reload, and it observes `user-questions/request` and `approval/request` with `{ prepend: true }` because an earlier answerer that claims the request would otherwise stop the waterfall before the observer runs.
- Add a `gotify` choice to the publish workflow.
- Declare `engines.dsh: ">=0.2.0-rc.1"` and drop the peer chain. `dsh-app-boot`'s `unmetRequirements` lets an own `engines.dsh` range decide alone and skips `peerDependencies` entirely, and it evaluates the range with `includePrerelease: true` — so one lower bound accepts every later host, prereleases included, where the previous chain needed a segment per host line. A host that breaks these APIs now surfaces at runtime instead of being refused at load.
- Widen the harness peer ranges so a host upgrade cannot strand the row. The settings peer becomes an explicit chain across the 0.2 line and beyond (`^0.2.0-rc.1 || ^0.2.1-alpha.1 || ^0.3.0-0 || ^0.4.0-0 || >=0.5.0`) instead of an exact `0.2.0-rc.2` pin, and `cordis`/`schemastery` lose their tilde upper bounds. npm's default prerelease rule only admits a prerelease whose major.minor.patch the range actually names, which is why the host's own `0.2.1-rc.1` needs its own segment; add a segment when a new host line opens.
- Resolve `@deepseek-ai/schemastery` through the harness loader's own bare specifier first. Inside Electron `import.meta.url` is not always a plain `file:` URL, so the previous `createRequire` anchor failed and the Gotify row announced no configuration schema. The status report now carries the module URL and each anchor's failure, so an unresolved schema needs no Host log.
- Migrate the workspace from pnpm to Bun: `workspaces` in the root `package.json` replaces `pnpm-workspace.yaml`, `bun.lock` replaces `pnpm-lock.yaml`, and CI installs and validates with Bun.
- Keep publishing on the npm CLI: `bun publish` supports neither `--provenance` nor npm Trusted Publishing (GitHub OIDC), so the release workflow installs with Bun and publishes with npm.
- Pin the dependency audit to the official npm registry so a configured mirror cannot hide advisories.
- Force `source-map-js` to `^1.2.2` through `overrides` (GHSA-68fv-2mgg-jv7q, high; dev-only through `vitest → vite → postcss`). The advisory was already present in `pnpm-lock.yaml`, and `bun audit fix` reports it blocked by postcss's range even though `^1.2.1` allows `1.2.2`.

## 0.1.0 — 2026-09-25

- Initial public monorepo.
- Publish `@wha7ever/dsh-firefly-theme` as a DSH bundle with a browser theme half.
- Publish `@wha7ever/dsh-mcp-console` as a DSH bundle with Host tools and a browser settings panel.
- Add English and Simplified Chinese plugin metadata.
- Keep personal DSH configuration out of the repository.

## 0.1.1 — 2026-09-25

- Move package names to the npm account scope `@wha7ever`.
- Publish subsequent releases through npm Trusted Publishing (GitHub Actions OIDC).

## 0.1.2 — 2026-09-25

- Improve model-ID contrast in the Firefly theme's model picker.

## 0.2.0 — 2026-10-01

- Add `@wha7ever/dsh-web-search-anysearch`, a community fork of `@anysearch/anysearch-dsh@0.1.6` (MIT, AnySearch Team) adapted for DSH 0.2.
- Replace upstream's DSH peer whitelist (which ends at `0.1.6-alpha.2` and makes DSH's install-time precheck reject the plugin on 0.1.7/0.2.0) with `>=0.1.7-rc.2 <0.2.0-0 || >=0.2.0-rc.1 <0.3.0-0`.
- Allow one allowlisted runtime dependency (`@deepseek-ai/schemastery`) for TypeScript-built host plugins in the workspace check.
- Verify the fork against DSH `0.1.7-rc.2` and `0.2.0-rc.2`; both register the same `anysearch` provider id as upstream, so install only one of them.
