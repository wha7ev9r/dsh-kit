# @wha7ev9r/dsh-mcp-console

A dependency-free DSH bundle that makes MCP rows visible and controllable from the Web settings page. It also registers two Host tools for agents:

- `mcp_status` — list every DSH MCP client row and its current lifecycle state.
- `mcp_toggle` — enable or disable one row by its Loader id.

## Install

```powershell
dsh plugin --profile web add @wha7ev9r/dsh-mcp-console@0.1.0

# Optional: Host tools without the browser panel.
dsh plugin --profile headless add @wha7ev9r/dsh-mcp-console@0.1.0
```

The package owns its `mcp-console` row through `cordis.patch.yml`; no duplicate row is needed in the profile patch.

## Design

The Host half reads the live Loader entries and updates them through `loader.update()`. The browser half talks to the package's exact route on DSH's authenticated `/api` connection channel and contributes an additive `settings.section` entry. MCP endpoints, headers, and credentials remain in the local profile; this package never stores them.

All visible panel text is registered in both English and Simplified Chinese. The panel uses DSH theme aliases and does not import Harness client UI internals.

## Compatibility

See the repository [`COMPATIBILITY.md`](../../COMPATIBILITY.md). The package currently targets the DSH `0.1.7-rc.2` contract inspected on 2026-09-25. DSH internal Loader and Client contracts may change between releases.

## License

MIT
