# @wha7ever/dsh-gotify-notify

English | [中文](README.zh.md)

Push a [Gotify](https://gotify.net/) notification when DeepSeek Harness needs you, so you can leave the window and still come back at the right moment.

## What it sends

| Trigger | When the push is sent |
| --- | --- |
| **Question** | The instant the harness composes a question for you, before you answer it. |
| **Approval** | While a tool call is blocked waiting for your decision. |
| **Turn finished** | Once the turn has actually stopped, including a goal that ran out of rounds. |
| **Failure** | A root turn errored. Off by default. |

A session that continues by itself does not ping you per round. The completion push is skipped while the session has an `active`, `armed` goal, because `dsh-goal-round-driver` owns it and will queue the next round; every way that driver stops leaves the goal observable, so the alert arrives when the goal is `complete`, `blocked` (the round cap records a `round-limit` blocker), `paused`, or disarmed after a resume. In a session with no goal the push follows a short settle window that a restart of the agent cancels.

## Install

```powershell
dsh plugin --profile web add @wha7ever/dsh-gotify-notify@0.1.1
```

The bundle inserts its own `gotify-notify` row, so nothing else has to be added to the profile composition.

## Configure

Open **Settings → Gotify 提醒** and fill in:

1. **Server URL** — the base address of your Gotify instance, without `/message`, for example `https://push.example.com`. A path prefix is kept, so `https://example.com/gotify` works too.
2. **Application token** — in the Gotify web UI open the **apps** tab in the upper right, add an application, and copy its token. Gotify 3 shows a token only once, at creation or rotation.
3. **Priority** — `0` is silent, `1-3` shows a bar icon, `4-7` adds a sound, `8-10` adds vibration. The default is `8`.

Then press **Send a test notification**. The test uses the *saved* configuration, so save your edits first.

Every field is saved into the active profile's Cordis patch, next to the rest of that profile's configuration, and takes effect on the next notification without a reload.

## How it works

The Host half declares one `gotify-notify` row whose entire Config is `.volatile()`. That is what `@deepseek-ai/dsh-settings` projects into an editable, revision-fenced form and what `apply` reads through `.get()` at push time.

```text
user-questions/request   ─┐
approval/request         ─┼─▶  compose a short message  ─▶  POST <server>/message
agent/status (idle)      ─┤                                  X-Gotify-Key: <app token>
agent/error              ─┘
```

The request body is JSON with `title`, `message`, `priority`, and `extras`; `extras["client::notification"].click.url` points back at the harness Web UI when the launch recorded one.

The two waterfall events (`user-questions/request`, `approval/request`) are observed only: every listener calls `next()`, so the shipped answerer still owns the decision. The completion push is attached to the root agent's `running → idle` edge, and only after the settle window described above.

## Network and secrets

- The application token is declared `role('secret')`. `@deepseek-ai/dsh-settings` never returns it to the browser: the page sees only whether one is set, and an empty token field keeps the stored value rather than clearing it.
- Pushes use plain `fetch`. The harness installs its outbound proxy policy on the global dispatcher before any plugin loads, so this call is proxied exactly like every other harness request, and loopback stays direct.
- The only outbound destination is the server URL you configure. Nothing else leaves the machine.
- Duplicate pushes (identical title and body within a few seconds) are dropped, and one push is in flight at a time, so a burst cannot flood your phone.

## Local verification

```powershell
bun run test
```

`test/host.test.mjs` imports the real `lib/index.js`, mounts it on a fake Cordis context with volatile-like Config fields, intercepts `fetch`, and drives the events the module subscribes to. It pins the registration ordering (`prepend`), every trigger, the exact Gotify request, the goal-continuation rule, credential handling, de-duplication, clamping, and the browser RPC surface.

`test/client.test.mjs` runs the real `lib/client.js` against a minimal React runtime and a fake Cordis context, then drives the settings page: it asserts the rendered controls and their labels, the staged-edit behaviour, that an invalid priority blocks the save, that an empty credential draft never clears the stored secret, and the exact `set`/`unset` operations a save submits.

`test/waterfall.test.mjs` pins the Cordis ordering rule the notification hooks depend on: a plain listener behind an answerer that claims a request never runs, while `{ prepend: true }` runs the observer first and `next()` still lets the answerer decide. It resolves `@deepseek-ai/cordis` from the active harness and skips when none is reachable.

## Removing it

Disable **Enable notifications** to stop pushing while keeping the configuration, or uninstall the bundle:

```powershell
dsh plugin --profile web remove @wha7ever/dsh-gotify-notify
```

## License

MIT
