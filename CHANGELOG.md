# Changelog

All notable changes to this project are documented here.

## Unreleased

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

## 0.2.0 — 2026-10-01

- Add `@wha7ever/dsh-web-search-anysearch`, a community fork of `@anysearch/anysearch-dsh@0.1.6` (MIT, AnySearch Team) adapted for DSH 0.2.
- Replace upstream's DSH peer whitelist (which ends at `0.1.6-alpha.2` and makes DSH's install-time precheck reject the plugin on 0.1.7/0.2.0) with `>=0.1.7-rc.2 <0.2.0-0 || >=0.2.0-rc.1 <0.3.0-0`.
- Allow one allowlisted runtime dependency (`@deepseek-ai/schemastery`) for TypeScript-built host plugins in the workspace check.
- Verify the fork against DSH `0.1.7-rc.2` and `0.2.0-rc.2`; both register the same `anysearch` provider id as upstream, so install only one of them.
