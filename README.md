# dsh-kit

`dsh-kit` is the public source repository for wha7ev9r's DeepSeek Harness (DSH) plugins and themes. It is intentionally separate from personal DSH configuration.

## Packages

| Package | Plane | Purpose |
| --- | --- | --- |
| [`@wha7ev9r/dsh-firefly-theme`](packages/dsh-firefly-theme) | Client | Firefly-inspired light/dark token theme for the DSH Web UI. |
| [`@wha7ev9r/dsh-mcp-console`](packages/dsh-mcp-console) | Host + Client | A settings panel for inspecting and enabling/disabling MCP rows, plus the `mcp_status` and `mcp_toggle` model tools. |

Both packages are ordinary DSH bundles. After publication, install the exact version that matches the compatibility baseline:

```powershell
dsh plugin --profile web add @wha7ev9r/dsh-firefly-theme@0.1.0
dsh plugin --profile web add @wha7ev9r/dsh-mcp-console@0.1.0

# The Host tools are useful in a headless profile too; the browser panel is not mounted there.
dsh plugin --profile headless add @wha7ev9r/dsh-mcp-console@0.1.0
```

`dsh plugin` writes the selected bundles to the target profile's own `package.json` and manages its local `node_modules`; no copy or synchronization step is required.

## Configuration boundary

Keep all personal state in the active DSH home, not in this repository:

```text
$DSH_HOME/
├─ .env
├─ .credentials.yaml
├─ AGENTS.md
└─ profiles/
   ├─ web/
   │  ├─ package.json
   │  ├─ pnpm-lock.yaml
   │  └─ cordis.patch.yml
   └─ headless/
      ├─ package.json
      └─ cordis.patch.yml
```

`cordis.patch.yml` remains the live source for model routes, default model, UI preferences, and MCP server rows. The public packages contain only code, bundle metadata, icons, translations, and documentation. There is no `dsh-config` mirror and no two-folder sync.

## Local development

Install the workspace dependencies only when you intend to run the checks:

```powershell
pnpm install --ignore-scripts
pnpm run check
pnpm audit --registry=https://registry.npmjs.org
```

To try a package before it is published, use DSH's local-link installation from this repository:

```powershell
# Run these commands from the dsh-kit repository root.
dsh plugin --profile web add link:.\packages\dsh-firefly-theme
dsh plugin --profile web add link:.\packages\dsh-mcp-console
```

A `link:` installation is a development convenience. Once a version is published, switch the profile to the exact npm version above; do not keep a permanent path dependency.

## Release checklist

1. Run `pnpm run check` and `pnpm audit --registry=https://registry.npmjs.org`.
2. Inspect the packed file list for each package and verify that no `.env`, credential file, profile configuration, or local absolute path is present.
3. Publish the packages to npm with public access.
4. Tag the Git commit and update [`CHANGELOG.md`](CHANGELOG.md) and [`COMPATIBILITY.md`](COMPATIBILITY.md) when the verified DSH baseline changes.

The repository includes a manual GitHub Actions publish workflow. Configure an `NPM_TOKEN` repository secret before using it, then trigger the workflow from the Actions tab or with:

```powershell
gh workflow run publish.yml --repo wha7ev9r/dsh-kit -f package=both
```

The workflow validates the workspace, publishes the selected public packages to the official npm registry, and requests provenance. npm's provenance and trusted-publisher options are documented by npm; do not put a token in a workflow file or commit.

## License

[MIT](LICENSE)
