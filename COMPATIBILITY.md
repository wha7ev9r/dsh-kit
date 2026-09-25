# Compatibility

These packages use DSH bundle and client contracts that are still evolving. They are not a promise of compatibility with every future DSH release.

## Verified baseline

| Item | Value |
| --- | --- |
| DSH package inspected locally | `@deepseek-ai/dsh@0.1.7-rc.2` |
| Verification date | 2026-09-25 |
| Node.js used for local inspection | `v26.3.0` |
| Package manager | `pnpm@12.4.1` |

The baseline was checked against the installed DSH package and the live Host/Client inspection providers. The original local plugins were live before the public-package migration; the newly named packages must still be installed once and verified in the target profile after their first publication.

## Contracts used

- `dsh.bundle.patch` loads a package-owned Cordis patch.
- `dsh.client.platform: web` exposes a browser half through the DSH client module loader.
- The theme uses the documented `--dsw-alias-*` token aliases and `ctx.theme.overrideTokens()`.
- The MCP console uses `loader.entries()`, `loader.update()`, the `tools` registry, and the authenticated Connection `/api` fetch channel.
- The settings panel contributes to the additive `settings.section` slot with id `mcp-servers`.

## Upgrade policy

Before changing the DSH version, copy the active profile files to a temporary backup, test the new DSH version in a separate `$DSH_HOME`, then update this file only after the package rows load and the settings page renders. Do not use `@latest` or another floating dist-tag for the plugins.
