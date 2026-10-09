<div align="center">
  <h1>@wha7ever/dsh-web-search-anysearch</h1>
  <p>由 AnySearch 驱动，为 DeepSeek Harness 提供实时网页搜索与垂直领域搜索能力。</p>
  <p><a href="https://www.npmjs.com/package/@wha7ever/dsh-web-search-anysearch"><img src="https://img.shields.io/npm/v/%40wha7ever%2Fdsh-web-search-anysearch?logo=npm" alt="npm 版本"></a> <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT 许可证"></a> <a href="https://github.com/deepseek-ai/deepseek-harness"><img src="https://img.shields.io/badge/DeepSeek-Harness-4F46E5" alt="DeepSeek Harness 插件"></a></p>
  <p><a href="README.md">English</a> | <strong>简体中文</strong></p>
</div>

> **社区二开版。** 本包基于 [`@anysearch/anysearch-dsh`](https://github.com/anysearch-team/anysearch-dsh)（MIT，© 2026 AnySearch Team）重新发布，仅更新 DSH 兼容声明与发布流水线；Provider 代码、工具与行为均与上游 0.1.6 一致，未做功能改动。与 AnySearch 官方无隶属关系。**请勿与原版同时安装**：两者注册相同的 `anysearch` web provider id。

`@wha7ever/dsh-web-search-anysearch` 将 [AnySearch](https://anysearch.com) 作为插件接入 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)。无需改变 Harness 使用方式，即可通过原生 `web_search` 和 `web_fetch` 获得实时网页搜索、URL 清洗正文、垂直领域搜索和批量搜索能力。

AnySearch 是面向 AI Agent 的搜索基础设施，覆盖公开网页，以及代码、金融、学术、法律、安全等专业数据源。

## 快速开始

将插件安装到 `web` profile：

```sh
npx -y @deepseek-ai/dsh plugin --profile web add @wha7ever/dsh-web-search-anysearch
```

启动 DeepSeek Harness：

```sh
npx -y @deepseek-ai/dsh web
```

快速体验不需要 API Key。未配置时，请求使用 AnySearch 匿名额度。

## 提供什么

- 通过 Harness 内置的 `web_search` 返回 AnySearch 搜索结果，来源包含标题、摘要和 URL，便于引用。
- 通过 Harness 内置的 `web_fetch` 调用 AnySearch Extract，抓取并清洗指定公开 HTTP(S) URL 的正文。
- 实时发现可搜索领域、垂直分类和支持的参数，再用标签、地区、语言和结构化参数执行高级搜索。
- 一次并发执行一至五个搜索，单项失败不影响其他结果。
- 高级搜索会保留没有来源 URL 的有效结构化结果；对于带网页来源的结果，可按需返回清洗正文。

## 可选 API Key

无需 API Key 即可体验。

注册 AnySearch 账号并配置 API Key 后，可获得每天 1000 次免费搜索调用额度。

访问 [anysearch.com](https://anysearch.com) 注册并登录，然后前往 [API Keys](https://www.anysearch.com/console/api-keys) 获取。获取后，将凭据写入 `$DSH_HOME/.credentials.yaml`，默认位置是 `~/.dsh/.credentials.yaml`：

```yaml
ANYSEARCH_API_KEY: "as_sk_your_key"
```

插件会在每次操作时解析受管凭据，因此轮换凭据后，下一次请求即可使用新值，无需重启 DSH。启动进程的 `ANYSEARCH_API_KEY` 环境变量具有更高优先级。

可以检查最终组合配置，输出中不会出现真实凭据值：

```sh
npx -y @deepseek-ai/dsh --profile web --dump-config
```

## 工具

| 使用场景 | Harness 工具 |
|---|---|
| 普通网页搜索 | `web_search` |
| 抓取并清洗指定 URL | `web_fetch` |
| 查看可用领域和标签 | `anysearch_capabilities` |
| 垂直或参数化搜索 | `anysearch_search` |
| 一次执行一至五个搜索 | `anysearch_batch_search` |

对于普通提示词，让 Harness 自动选择工具即可。模型可以先读取实时领域和参数定义，再执行专门搜索。

## 环境依赖

需要 Node.js 22.19 或 Node.js 24+、pnpm 11.7 和 DeepSeek Harness。DSH 插件命令使用 pnpm 管理 profile 依赖，因此 `pnpm` 必须位于 `PATH` 中。

Windows、Linux 和 macOS 使用相同的安装命令。安装前请确保 Node.js、`npx` 和 `pnpm` 均可从 `PATH` 直接运行。

## 配置

随包提供的 profile 层会自动将 AnySearch 设为现有 `ctx.web` 的搜索与抓取 Provider、启用 `web_fetch`，并挂载高级工具，默认无需修改。

如需自定义，请把下面的完整条目加入目标 DSH profile 的用户配置层，以覆盖随包提供的 `id: web-search-anysearch` 配置。保持 `id` 不变，完整替换 `config`，不要使用不同 ID 新增第二个 AnySearch Provider：

```yaml
- id: web-search-anysearch
  config:
    apiKeyEnv: ANYSEARCH_API_KEY
    baseURL: https://api.anysearch.com
    maxRenderedContentChars: 12000
```

| 字段 | 默认值 | 用途 |
|---|---|---|
| `apiKeyEnv` | `ANYSEARCH_API_KEY` | DSH 凭据引用；缺失时使用匿名访问 |
| `baseURL` | `https://api.anysearch.com` | AnySearch API 基础地址 |
| `maxRenderedContentChars` | `12000` | 单次高级工具调用向模型展示的结果正文字符上限 |

## 管理插件

更新：

```sh
npx -y @deepseek-ai/dsh plugin --profile web update @wha7ever/dsh-web-search-anysearch
```

移除：

```sh
npx -y @deepseek-ai/dsh plugin --profile web remove @wha7ever/dsh-web-search-anysearch
```

## 兼容性与限制

- DSH peer 范围：本插件消费的 `@deepseek-ai/dsh-*` 服务声明为 `>=0.1.7-rc.2 <0.2.0-0 || >=0.2.0-rc.1 <0.3.0-0`。已在 DSH `0.1.7-rc.2` 与 `0.2.0-rc.2` 上验证；这两个版本之间所有插件可见的 DSH 包逐字节相同。
- DeepSeek Harness 仍处于开发预览阶段，可能发布不兼容变更。
- 网页提取通过 Harness 原生 `web_fetch` 暴露；插件不会再增加一个重复的 `anysearch_extract` 工具。
- 请通过 DSH 管理的凭据文件或环境变量配置 API Key；DSH 设置页当前不提供第三方 Provider 凭据输入项。
- 已知上游行为：随包 patch 会把宿主 `web` 服务指向 `searchProvider: anysearch`。仅把插件开关关掉而不移除，会让该指向悬空，`web_search`/`web_fetch` 会持续报 `WEB_PROVIDER_CONFIGURED_MISSING`；需移除插件或覆盖 `web` 行才能恢复。详见[上游 issue #15](https://github.com/anysearch-team/anysearch-dsh/issues/15)。

## 开发

本包位于 [`wha7ev9r/dsh-kit`](https://github.com/wha7ev9r/dsh-kit) monorepo：

```sh
git clone https://github.com/wha7ev9r/dsh-kit.git
cd dsh-kit
bun install --ignore-scripts
bun run --filter @wha7ever/dsh-web-search-anysearch check
```

真实 AnySearch E2E 测试需要显式开启。匿名模式不会读取环境中的凭据：

```sh
ANYSEARCH_E2E=1 ANYSEARCH_E2E_ANONYMOUS=1 bun run --filter @wha7ever/dsh-web-search-anysearch test:e2e
```

## 许可证

[MIT](LICENSE)。基于 [`@anysearch/anysearch-dsh`](https://github.com/anysearch-team/anysearch-dsh)，© 2026 AnySearch Team；二开修改部分 © 2026 wha7ever。
