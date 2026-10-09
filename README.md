# dsh-kit

`dsh-kit` is the public source repository for wha7ev9r's DeepSeek Harness (DSH) plugins and themes. It is intentionally separate from personal DSH configuration.

## Packages

| Package | Plane | Purpose |
| --- | --- | --- |
| [`@wha7ever/dsh-firefly-theme`](packages/dsh-firefly-theme) | Client | Firefly-inspired light/dark token theme for the DSH Web UI. |
| [`@wha7ever/dsh-mcp-console`](packages/dsh-mcp-console) | Host + Client | A settings panel for inspecting and enabling/disabling MCP rows, plus the `mcp_status` and `mcp_toggle` model tools. |
| [`@wha7ever/dsh-web-search-anysearch`](packages/dsh-web-search-anysearch) | Host | Community fork of `@anysearch/anysearch-dsh` kept installable on DSH 0.1.7/0.2: AnySearch web search and fetch providers plus the `anysearch_*` tools. |

All packages are ordinary DSH bundles. After publication, install the exact version that matches the compatibility baseline:

```powershell
dsh plugin --profile web add @wha7ever/dsh-firefly-theme@0.1.1
dsh plugin --profile web add @wha7ever/dsh-mcp-console@0.1.1
dsh plugin --profile web add @wha7ever/dsh-web-search-anysearch@0.2.0

# The Host tools are useful in a headless profile too; the browser panel is not mounted there.
dsh plugin --profile headless add @wha7ever/dsh-mcp-console@0.1.1
```

Do not install the AnySearch fork alongside the upstream `@anysearch/anysearch-dsh`; both register the same `anysearch` web provider id.

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

Install the workspace dependencies only when you intend to run the checks. Development requires [Bun](https://bun.com) 1.4.2 or newer:

```powershell
bun install --ignore-scripts
bun run check
bun run --filter @wha7ever/dsh-web-search-anysearch check
bun run audit
```

`bun run audit` pins the official npm registry, so a mirror configured in `~/.npmrc` cannot hide advisories.

To try a package before it is published, use DSH's local-link installation from this repository:

```powershell
# Run these commands from the dsh-kit repository root.
dsh plugin --profile web add link:.\packages\dsh-firefly-theme
dsh plugin --profile web add link:.\packages\dsh-mcp-console
```

A `link:` installation is a development convenience. Once a version is published, switch the profile to the exact npm version above; do not keep a permanent path dependency.

## Release checklist

1. Run `bun run check` and `bun run audit`.
2. Inspect the packed file list for each package and verify that no `.env`, credential file, profile configuration, or local absolute path is present.
3. Publish the packages to npm with public access.
4. Tag the Git commit and update [`CHANGELOG.md`](CHANGELOG.md) and [`COMPATIBILITY.md`](COMPATIBILITY.md) when the verified DSH baseline changes.

The repository includes a manual GitHub Actions publish workflow. After the one-time first release, configure each package's npm Trusted Publisher to allow `wha7ev9r/dsh-kit` and workflow `publish.yml`; the workflow then uses GitHub OIDC and no npm token. Trigger it from the Actions tab or with:

```powershell
# `both` publishes theme + console; pass anysearch, theme, or console to publish a single package.
gh workflow run publish.yml --repo wha7ev9r/dsh-kit -f package=both
gh workflow run publish.yml --repo wha7ev9r/dsh-kit -f package=anysearch
```

The workflow installs and validates the workspace with Bun, then publishes the selected public packages with the npm CLI. Publishing deliberately stays on npm: `bun publish` supports neither `--provenance` nor npm Trusted Publishing (GitHub OIDC) yet, so the release path keeps the npm CLI while everything else uses Bun. npm's provenance and trusted-publisher options are documented by npm; do not put a token in a workflow file or commit.

## License

[MIT](LICENSE)
