# @wha7ev9r/dsh-firefly-theme

A small, dependency-free DSH Web UI theme. It overlays the active light/dark theme with a mint and teal palette and supplies an inherited body text color for UI surfaces that do not declare their own foreground color.

## Install

```powershell
dsh plugin --profile web add @wha7ev9r/dsh-firefly-theme@0.1.0
```

The package is a DSH bundle. Its `cordis.patch.yml` inserts the `firefly-theme` row, so the profile does not need a duplicate row in its personal patch file.

## What it changes

- Overrides the documented `--dsw-alias-*` theme tokens in both light and dark modes.
- Injects a disposable `body` color rule for DSH surfaces that inherit their foreground color.
- Removes the token layer and style element when the plugin is unloaded.

The package contains no model routes, credentials, MCP endpoints, or profile configuration.

## Compatibility

See the repository [`COMPATIBILITY.md`](../../COMPATIBILITY.md). The package currently targets the DSH `0.1.7-rc.2` contract inspected on 2026-09-25. DSH client/theme internals may change between releases.

## License

MIT
