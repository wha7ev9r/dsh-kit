# Compatibility

These packages use DSH bundle and client contracts that are still evolving. They are not a promise of compatibility with every future DSH release.

## Verified baseline

| Item | Value |
| --- | --- |
| DSH package inspected locally | `@deepseek-ai/dsh@0.2.0-rc.2` |
| Verification date | 2026-10-01 |
| Node.js used for local inspection | `v26.3.0` |
| Package manager | `pnpm@12.4.1` |

The baseline was checked against the installed DSH package and the live Host/Client inspection providers. The published `0.1.1` packages were installed into both local profiles through npm; the web/headless package manifests and locks contain exact versions, the composed rows resolve to `@wha7ever/*`, and the live `settings.section` slot reports `mcp-servers` active. A newly created Agent is required to observe the Host tool registry after a live profile reload.

## AnySearch fork

`@wha7ever/dsh-web-search-anysearch` forks `@anysearch/anysearch-dsh@0.1.6` (MIT, AnySearch Team). Upstream 0.1.6 declares its DSH peers as a closed whitelist ending at `0.1.6-alpha.2`, so DSH's install-time peer precheck rejects it on `0.1.7`/`0.2.0` (upstream issues #14 and #20). The fork changes package identity, DSH peer ranges, and the publishing pipeline only; provider code is upstream's.

- Peer range: `>=0.1.7-rc.2 <0.2.0-0 || >=0.2.0-rc.1 <0.3.0-0` for `dsh-web`, `dsh-tools`, `dsh-tool-web`, `dsh-credentials`, and `dsh-system-prompt` (two segments so pre-release hosts like `0.2.0-rc.2` also satisfy npm's default, non-`includePrerelease` peer check).
- Evidence: every plugin-facing package (`dsh-web`, `dsh-tools`, `dsh-tool-web`, `dsh-credentials`, `dsh-system-prompt`, plus `cordis@4.0.4` and `schemastery@3.18.4`) is byte-identical between `0.1.7-rc.2` and `0.2.0-rc.2`; `defineTool`, `ctx.tools.register`, `ctx.web.registerSearchProvider`/`registerFetchProvider`, and `ctx.credentials.resolve` signatures are unchanged across the two releases.
- Run `pnpm --filter @wha7ever/dsh-web-search-anysearch run test:compat` to re-verify the declared matrix against published DSH versions.

## Contracts used

- `dsh.bundle.patch` loads a package-owned Cordis patch.
- `dsh.client.platform: web` exposes a browser half through the DSH client module loader.
- The theme uses the documented `--dsw-alias-*` token aliases and `ctx.theme.overrideTokens()`.
- The MCP console uses `loader.entries()`, `loader.update()`, the `tools` registry, and the authenticated Connection `/api` fetch channel.
- The settings panel contributes to the additive `settings.section` slot with id `mcp-servers`.
- The AnySearch fork registers `ctx.web` search and fetch providers (id `anysearch`), resolves credentials through `ctx.credentials.resolve()`, and registers its advanced tools through `ctx.tools.register(defineTool(...))`, declaring `inject: ['web', 'credentials', 'systemPrompt', 'tools']`.

## Upgrade policy

Before changing the DSH version, copy the active profile files to a temporary backup, test the new DSH version in a separate `$DSH_HOME`, then update this file only after the package rows load and the settings page renders. Do not use `@latest` or another floating dist-tag for the plugins.
