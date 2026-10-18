# @wha7ever/dsh-plugin-updates

一个 DeepSeek Harness 插件包：检查当前 profile 里已安装的插件是否有更新的 npm 或 GitHub 版本，并在 **Plugins** 页面提示。它只负责提醒，不会自动安装、卸载或启用任何插件。

## 功能

- DSH 启动几秒后在后台检查，不阻塞启动。
- 通过 `ctx.pluginManager.listBundles()` 读取已安装的 bundle：第三方 profile 依赖，以及安装随附的官方 bundle。
- 优先请求 dist-tag manifest（`latest`、`next`，或 profile 记录的 tag），失败后按顺序换源。
- 在 Web 的 Plugins 页新增 **更新** 标签页（排在 **发现** 前），并在每个插件的详情页显示更新徽标和版本对比。
- 官方插件合并成一条 DSH 发布线：官方 bundle 随 DSH 发布，不逐个更新。
- Host 内存保留上次成功结果，页面秒开；源不可用时仍能显示旧数据并给出提示。

## 安装

### npm

```powershell
dsh plugin --profile web add @wha7ever/dsh-plugin-updates@latest
```

更新器故意用 `latest` 安装。它没有 peer 依赖，`engines.dsh` 只设下界，所以发布新版本不需要再改兼容性。即使 profile 记录的是精确版本，检查器也会对比 `latest`，因此仍会提醒。

### GitHub（monorepo 子目录）

本仓库根目录是 workspace，不是 bundle。安装 spec 必须带子目录：

```powershell
dsh plugin --profile web add "github:wha7ev9r/dsh-kit#path:packages/dsh-plugin-updates"
```

也可以直接粘贴到 **Plugins → Add plugin**：

```text
https://github.com/wha7ev9r/dsh-kit#path:packages/dsh-plugin-updates
```

pnpm v9 起支持 `#path:` 子目录形式。本包没有 dependencies、没有 peerDependencies、没有 build 脚本，所以 git 安装不需要解析 peer，也不会跑构建。只输入 `https://github.com/wha7ev9r/dsh-kit` 会失败：仓库根不是 bundle。

## 版本数据从哪里来

先使用 `ctx.pluginManager.registries()` 给出的源计划，再按顺序回退：

| 顺序 | 源 | 请求 |
| --- | --- | --- |
| 1 | 配置的 registry / npmmirror | `GET <registry><name>/<tag>` |
| 2 | npm 官方 | `GET https://registry.npmjs.org/<name>/<tag>` |
| 3 | 腾讯云 | `GET https://mirrors.cloud.tencent.com/npm/<name>/<tag>` |
| 4 | jsDelivr CDN | `GET https://cdn.jsdelivr.net/npm/<name>@<tag>/package.json` |
| 5 | npmx | `GET https://npmx.dev/api/registry/packument/<name>?version=<tag>` |

- pnpm 自己配置的私有 registry 只问它一个；不会把私有包名发给公共源。
- 同一个源失败 2 次后冷却 10 分钟；手动「立即检查」会清空冷却。
- 每个源都有短超时；单个源失败只影响该项，不会让整页失败。
- npmx 是 npm 的前端浏览器，不是镜像；它的 JSON 接口属于内部 API，所以放在最后，并可在 `fallbackSources` 中去掉。

Git 安装的 bundle 按以下顺序读取仓库里的包清单：

1. `raw.githubusercontent.com`；
2. jsDelivr 的 GitHub CDN；
3. `github.com/.../raw/...`；
4. 可选的 `githubProxy` 前缀。

都失败时显示「Git 安装，无法自动检查」。npm 安装的插件完全不依赖 GitHub。

## 配置

row 读取普通 config 对象，没有 Schemastery schema；下列字段都可选，写在 profile 的 `cordis.patch.yml`：

```yaml
- id: plugin-updates
  config:
    startupDelayMs: 8000
    refreshIntervalMs: 21600000
    requestTimeoutMs: 3000
    fallbackSources: [npmjs, tencent, jsdelivr, npmx]
    packageLink: npmx
```

| 字段 | 默认 | 说明 |
| --- | --- | --- |
| `enabled` | `true` | 关闭后台检查。 |
| `startupDelayMs` | `8000` | 启动后延迟；`0` 关闭启动检查。 |
| `refreshIntervalMs` | `21600000` | 成功结果 TTL（6 小时）。 |
| `requestTimeoutMs` | `3000` | 单源请求超时。 |
| `githubTimeoutMs` | `2500` | 单个 GitHub 方式超时。 |
| `concurrency` | `4` | 并发检查数。 |
| `fallbackSources` | `[npmjs, tencent, jsdelivr, npmx]` | 配置 registry 之后的公共回退源。 |
| `githubProxy` | 空 | 可选的 raw GitHub 代理前缀。 |
| `packageLink` | `npmx` | 详情页链接用 `npmx` 还是 `npmjs`。 |
| `includeOfficial` | `true` | 检查官方 DSH 发布线。 |
| `includeThirdParty` | `true` | 检查 profile 安装的第三方 bundle。 |
| `changeDebounceMs` | `1000` | 插件管理变更后的 debounce。 |
| `circuitBreakerFailures` | `2` | 源冷却前的失败次数。 |
| `circuitBreakerCooldownMs` | `600000` | 冷却时长。 |

## 更新方式

插件不会自己更新任何东西。DSH 的安装对话框拒绝重装已安装的 bundle；先卸载再安装如果在第二步失败，插件会保持未安装。因此这里保留提醒，并给出可复制的命令：

```powershell
dsh plugin --profile <profile> add "name@version"
```

Git 源使用记录下来的 spec 会重新拉取分支。插件详情页仍然保留原有的卸载/重装控件。

执行命令后重启 DSH（或接受 DSH 的重启提示）。注意 pnpm 的 `minimumReleaseAge`：刚发布的版本可能被压住，安装对话框报告的版本可能比检查到的旧。

## 安全与隐私

- 只做匿名 GET；不读取 `.npmrc` token 或凭据。
- 只请求源计划和固定的 GitHub/jsDelivr/npmx 主机；浏览器不能传任意 URL。
- 包名属于公开数据，会发给元数据源，和 pnpm 安装本身一致。
- report 不含 token、凭据或本地绝对路径。
- Client 半没有安装/卸载端点；唯一动作是复制命令。

## 限制

- 不做一键或批量更新。
- 官方插件随 DSH 更新，这里只报告发布线。
- 不检查传递依赖、不检查未安装的官方按需 bundle。
- 需要认证的私有 registry 标记为无法检查，不读取 token。
- Git 源只比较记录 ref 下的清单版本；同版本的新提交不会提示。
- report 缓存在内存；重启后重新检查。

## 验证

```powershell
bun run check
bun run test:updates
bun run audit
```

测试覆盖 SemVer 比较、源回退顺序、熔断、私有源、RPC 信封、启动定时器，以及 Client 注册与渲染。

## License

[MIT](LICENSE)
