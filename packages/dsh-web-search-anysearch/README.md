<div align="center">
  <h1>@wha7ever/dsh-web-search-anysearch</h1>
  <p>AnySearch-powered real-time web and vertical search for DeepSeek Harness.</p>
  <p><a href="https://www.npmjs.com/package/@wha7ever/dsh-web-search-anysearch"><img src="https://img.shields.io/npm/v/%40wha7ever%2Fdsh-web-search-anysearch?logo=npm" alt="npm version"></a> <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license"></a> <a href="https://github.com/deepseek-ai/deepseek-harness"><img src="https://img.shields.io/badge/DeepSeek-Harness-4F46E5" alt="DeepSeek Harness plugin"></a></p>
  <p><strong>English</strong> | <a href="README.zh-CN.md">简体中文</a></p>
</div>

> **Community fork.** This package republishes [`@anysearch/anysearch-dsh`](https://github.com/anysearch-team/anysearch-dsh) (MIT, © 2026 AnySearch Team) with updated DSH compatibility metadata and publishing pipeline. Provider code, tools, and behavior are those of upstream 0.1.6; no feature changes. Not affiliated with or endorsed by AnySearch. Do **not** install it alongside the upstream plugin: both register the same `anysearch` web provider id.

`@wha7ever/dsh-web-search-anysearch` connects [AnySearch](https://anysearch.com) to [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) as a plugin. Keep using Harness's native `web_search` and `web_fetch` while gaining real-time web search, cleaned URL content, vertical search, and concurrent batch search.

AnySearch is search infrastructure for AI agents, covering the public web and specialized data sources across code, finance, academia, law, security, and more.

## Quick start

Install the plugin into the `web` profile:

```sh
npx -y @deepseek-ai/dsh plugin --profile web add @wha7ever/dsh-web-search-anysearch
```

Start DeepSeek Harness:

```sh
npx -y @deepseek-ai/dsh web
```

No API key is required for a quick start. Requests use AnySearch's anonymous quota until you configure one.

## What you get

- Through Harness's built-in `web_search`, AnySearch returns results with titles, snippets, and URLs for easy citation.
- Through Harness's built-in `web_fetch`, AnySearch Extract retrieves and cleans the content of a specific public HTTP(S) URL.
- Discover searchable domains, vertical categories, and supported parameters in real time, then run advanced searches using tags, regions, languages, and structured parameters.
- Run one to five searches concurrently; an individual failure does not affect the other results.
- Advanced search preserves useful structured results without source URLs, while page-backed results can return cleaned content on demand.

## Optional API key

Try it without an API key.

Sign up for an AnySearch account and configure an API key to get 1,000 free search calls per day.

Sign up or sign in at [anysearch.com](https://anysearch.com), then visit [API Keys](https://www.anysearch.com/console/api-keys) to get one. Store the key in `$DSH_HOME/.credentials.yaml` (`~/.dsh/.credentials.yaml` by default):

```yaml
ANYSEARCH_API_KEY: "as_sk_your_key"
```

The plugin resolves the managed credential for every operation, so credential rotation reaches the next request without restarting DSH. A launching `ANYSEARCH_API_KEY` environment variable has higher priority.

Inspect the composed profile without exposing the credential value:

```sh
npx -y @deepseek-ai/dsh --profile web --dump-config
```

## Tools

| Use case | Harness tool |
|---|---|
| Ordinary web search | `web_search` |
| Fetch and clean a specific URL | `web_fetch` |
| Discover available domains and tags | `anysearch_capabilities` |
| Vertical or parameterized search | `anysearch_search` |
| Run one to five searches together | `anysearch_batch_search` |

For ordinary prompts, let Harness select the tool. Models can discover live domain and parameter definitions before making a specialized search.

## Environment requirements

Requires Node.js 22.19 or Node.js 24+, pnpm 11.7, and DeepSeek Harness. The DSH plugin command uses pnpm to manage profile dependencies, so `pnpm` must be available on `PATH`.

Windows, Linux, and macOS use the same installation command. Before installing, ensure that Node.js, `npx`, and `pnpm` can all be run directly from `PATH`.

## Configuration

The bundled profile layer automatically selects AnySearch as the existing `ctx.web` search and fetch provider, enables `web_fetch`, and mounts the advanced tools, so no changes are required by default.

To customize it, add the complete block below to the target DSH profile's user configuration layer, overriding the bundled `id: web-search-anysearch` entry. Keep the `id` unchanged, replace the complete `config`, and do not add a second AnySearch provider under a different ID:

```yaml
- id: web-search-anysearch
  config:
    apiKeyEnv: ANYSEARCH_API_KEY
    baseURL: https://api.anysearch.com
    maxRenderedContentChars: 12000
```

| Field | Default | Purpose |
|---|---|---|
| `apiKeyEnv` | `ANYSEARCH_API_KEY` | DSH credential reference; missing uses anonymous access |
| `baseURL` | `https://api.anysearch.com` | AnySearch API base URL |
| `maxRenderedContentChars` | `12000` | Maximum result-content characters rendered to the model per advanced tool call |

## Manage the plugin

Update:

```sh
npx -y @deepseek-ai/dsh plugin --profile web update @wha7ever/dsh-web-search-anysearch
```

Remove:

```sh
npx -y @deepseek-ai/dsh plugin --profile web remove @wha7ever/dsh-web-search-anysearch
```

## Compatibility and limitations

- DSH peer range: `>=0.1.7-rc.2 <0.2.0-0 || >=0.2.0-rc.1 <0.3.0-0` for the `@deepseek-ai/dsh-*` services this plugin consumes. Validated against DSH `0.1.7-rc.2` and `0.2.0-rc.2`; every plugin-facing DSH package is byte-identical between those releases.
- DeepSeek Harness is in developer preview and may make compatibility-breaking changes.
- URL extraction is exposed through Harness's provider-neutral `web_fetch`; the plugin does not add a duplicate `anysearch_extract` tool.
- Configure the API key through DSH-managed credentials or an environment variable; the DSH settings page does not currently provide a third-party Provider credential field.
- Known upstream behavior: the bundle patch selects `searchProvider: anysearch` for the host `web` service. Toggling the plugin off without removing it leaves that selection dangling, so `web_search`/`web_fetch` fail with `WEB_PROVIDER_CONFIGURED_MISSING` until you remove the plugin or override the `web` row. See [upstream issue #15](https://github.com/anysearch-team/anysearch-dsh/issues/15).

## Development

This package lives in the [`wha7ev9r/dsh-kit`](https://github.com/wha7ev9r/dsh-kit) monorepo:

```sh
git clone https://github.com/wha7ev9r/dsh-kit.git
cd dsh-kit
pnpm install --ignore-scripts
pnpm --filter @wha7ever/dsh-web-search-anysearch run check
```

The live AnySearch E2E suite is opt-in. Run it without ambient credentials in anonymous mode:

```sh
ANYSEARCH_E2E=1 ANYSEARCH_E2E_ANONYMOUS=1 pnpm --filter @wha7ever/dsh-web-search-anysearch run test:e2e
```

## License

[MIT](LICENSE). Based on [`@anysearch/anysearch-dsh`](https://github.com/anysearch-team/anysearch-dsh), © 2026 AnySearch Team; fork modifications © 2026 wha7ever.
