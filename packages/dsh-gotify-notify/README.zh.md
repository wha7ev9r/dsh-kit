# @wha7ever/dsh-gotify-notify

[English](README.md) | 中文

当 DeepSeek Harness 需要你时，通过 [Gotify](https://gotify.net/) 推送一条通知，这样你可以离开窗口，到真正需要回来的时刻再回来。

## 会推送什么

| 触发时机 | 推送时点 |
| --- | --- |
| **提问** | Harness 为你生成问题的瞬间，早于你作答。 |
| **审批** | 有工具调用被阻塞、等待你的决定期间。 |
| **一轮结束** | 这一轮真的停下来之后，包含目标轮次用尽的情况。 |
| **执行出错** | 根会话的一轮报错。默认关闭。 |

会自动继续的会话不会每轮都打扰你：只要会话有一个 `active` 且 `armed` 的目标，就跳过结束推送——那一轮由 `dsh-goal-round-driver` 负责续跑。该驱动所有停止方式都会在目标状态上留下痕迹，因此推送会在目标变为 `complete`、`blocked`（轮次上限会写入 `round-limit` 阻断）、`paused`，或 resume 后未激活时送达。没有目标的会话则在短暂的稳定窗口后推送，只要 agent 重新开始运行就取消。

## 安装

```powershell
dsh plugin --profile web add @wha7ever/dsh-gotify-notify@0.1.2
```

本 bundle 自带 `gotify-notify` 行，无需再往 profile 组合里添加任何东西。

## 配置

打开 **设置 → Gotify 提醒**，依次填写：

1. **服务器地址** —— Gotify 实例的基础地址，不要带 `/message`，例如 `https://push.example.com`；路径前缀会保留，`https://example.com/gotify` 同样可用。
2. **应用令牌** —— 在 Gotify 网页版右上角打开 **apps** 标签，新建应用并复制令牌。Gotify 3 只在创建或轮换时显示一次令牌。
3. **优先级** —— `0` 静默，`1-3` 状态栏图标，`4-7` 加提示音，`8-10` 再加振动。默认 `8`。

然后点 **发送测试通知**。测试使用的是**已保存**的配置，所以请先保存再测试。

所有字段都写入当前 profile 的 Cordis patch，与这个 profile 的其他配置放在一起；保存后在下一次通知时立即生效，无需重载。

## 工作原理

Host 侧声明一个 `gotify-notify` 行，其 Config 的每个字段都是 `.volatile()`。`@deepseek-ai/dsh-settings` 正是把这种字段投影成可编辑、带 revision 校验的表单，而 `apply` 在推送时通过 `.get()` 读取它们。

```text
user-questions/request   ─┐
approval/request         ─┼─▶  组装简短正文  ─▶  POST <server>/message
agent/status (idle)      ─┤                       X-Gotify-Key: <app token>
agent/error              ─┘
```

请求体是 JSON，包含 `title`、`message`、`priority`、`extras`；当启动时记录了 Web UI 地址，`extras["client::notification"].click.url` 会指回 Harness 界面。

两个 waterfall 事件（`user-questions/request`、`approval/request`）只做观察：监听器一律调用 `next()`，决定权仍在自带的回答者手里。结束推送挂在根 agent 的 `running → idle` 边沿上，并经过上述稳定窗口。

## 网络与密钥

- 应用令牌声明为 `role('secret')`。`@deepseek-ai/dsh-settings` 永远不会把它返回给浏览器：页面只能看到「是否已配置」，且令牌输入框留空表示保持原值，而不是清空。
- 推送使用原生 `fetch`。Harness 在所有插件加载前就把出网代理策略装到全局 dispatcher 上，所以这次请求和其他所有 Harness 请求走同一套代理规则，回环地址保持直连。
- 唯一的外部目标是你在设置里填的服务器地址，其余数据不出本机。
- 短时间内容完全相同的推送会被丢弃，且同一时刻只允许一条推送在途，避免把你的手机刷屏。

## 本地验证

```powershell
bun run test
```

`test/host.test.mjs` 直接 import 真实的 `lib/index.js`，挂到带 volatile 式 Config 字段的假 Cordis 上下文上，拦截 `fetch`，并驱动该模块订阅的各个事件。它钉住注册顺序（`prepend`）、每个触发点、真实的 Gotify 请求、目标续跑规则、密钥处理、去重、优先级夹取，以及浏览器 RPC 面。

`test/client.test.mjs` 用最小 React 运行时 + 假 Cordis 上下文直接跑真实的 `lib/client.js`，并驱动设置页：断言渲染出的控件与其 label 关联、暂存编辑行为、优先级非法时阻止保存、令牌留空绝不会清掉已存密钥，以及保存时提交的每一条 `set`/`unset` 操作。

`test/waterfall.test.mjs` 钉住这些提醒钩子依赖的 Cordis 顺序规则：位于「抢先作答」的回答者之后的普通监听器永远不会执行，而 `{ prepend: true }` 会让观察者先跑、`next()` 之后仍由回答者决定。它会从当前 Harness 解析 `@deepseek-ai/cordis`，解析不到时自动跳过。

## 卸载

关闭 **启用提醒** 可以在保留配置的前提下停止推送；或卸载 bundle：

```powershell
dsh plugin --profile web remove @wha7ever/dsh-gotify-notify
```

## 许可

MIT
