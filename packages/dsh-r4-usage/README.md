# @wha7ever/dsh-r4-usage

An r4 usage dashboard for DeepSeek Harness. It pins one small card to the right edge of the composer dock — collapsed to a single line — and expands it into a detail panel: plan budget, every spend window, the API key's own limit, today's requests and tokens, the last seven days of charges, and the per-model split, each budget as a progress bar with the remaining share.

The numbers come from the documented read-only `/v1/cli` endpoints of the r4 API:

| Endpoint | Used for |
| --- | --- |
| `GET /v1/cli/key` | the calling key's limit, spend, in-flight hold, today, and seven-day series (authoritative; a failure is fatal to the card) |
| `GET /v1/cli/usage` | the account's per-model split; the card's seven-day chart stays on the key series |
| `GET /v1/cli/meta` | plan name, remaining/total budget, expiry, spend windows, and wallet balance (a display snapshot; the docs note it may lag up to 24 hours) |

## Install

The repository root is a Bun workspace, not a bundle, so the bare repository URL is not installable — point at the package subdirectory:

```powershell
dsh plugin --profile desktop add "github:wha7ev9r/dsh-kit#path:packages/dsh-r4-usage"
```

This records the GitHub spec in the profile and pins the resolved commit in the profile lock. To pick up a later commit, run the same `add` again (or `dsh plugin --profile desktop update @wha7ever/dsh-r4-usage`) and restart DSH, then refresh the page.

The package declares **no `engines` and no `peerDependencies`**, so no version range in the package can refuse to load it on a newer DSH; a changed harness contract surfaces as an error inside the card instead.

## Configure

Defaults, all overridable in `cordis.patch.yml` under the same row id. A patch replaces the whole config object, so repeat every key you want to change:

```yaml
- id: r4-usage
  config:
    baseUrl: https://api.r4.codes
    apiKeyEnv: R4_API_KEY
    timezone: Asia/Shanghai
    refreshMs: 60000
```

| Key | Default | Meaning |
| --- | --- | --- |
| `baseUrl` | `https://api.r4.codes` | r4 host serving `/v1/cli/*`; a trailing slash is ignored |
| `apiKeyEnv` | `R4_API_KEY` | credential-store reference resolved on every read |
| `timezone` | `Asia/Shanghai` | sent as `?tz=`, decides the local days of `today` and `series` |
| `refreshMs` | `60000` | browser poll interval, read from the snapshot; the host cache lives at least 30 s and the card's Refresh forces a read |

## The API key

Use a **standard-purpose** r4 key (the `coder-` form). Monitoring-purpose keys are refused by the API with `STANDARD_KEY_REQUIRED`, and the card shows that reason.

The key is entered in the expanded card and written through `ctx.credentials.set()` into the DSH credential store (`refs` in `$DSH_HOME/.credentials.yaml`), so it never appears in a config file, a repository, or this package's code. Reads resolve the reference per call, which is why a saved key is effective immediately. The browser never receives the key back: the snapshot carries only the API's own hint (`key.start`) and whether a credential is configured. All outbound requests run in the Host process, so no browser CORS path carries the key either.

## Behaviour

- Collapsed by default: the card shows the label, the used share, a mini bar, and the remaining budget. Expanding opens a 340 px panel to the left of that edge, capped at 320 px with its own scroll, so it never covers the shipped composer data; Escape collapses it.
- Polls at the Host's `refreshMs` (60 s by default) while mounted, plus one forced read when Refresh is pressed (minimum 5 s between forced reads). The host caches one snapshot and de-duplicates concurrent reads, so several sessions share one read instead of polling independently.
- The seven-day series is padded to seven buckets from its last day (or the response's `day`), so a short or missing response still draws a full week.
- A failed refresh keeps the last good numbers and shows the failure on the card, so a temporary outage does not blank the pill.
- `limit_usd` or a window `ceiling_usd` of `null` renders as “No limit” without a bar. A negative remaining value is shown as an over-limit error state.
- Everything visible is registered in English and Simplified Chinese through the locale service; the layout uses only `--dsw-alias-*` theme tokens and no harness client package.

## Verify

```powershell
bun install --ignore-scripts
bun run check
bun run test:r4-usage
```

`bun run check` validates the package shape, the client module id, and the client syntax; `bun run test:r4-usage` runs the offline wire-normalization checks.

After installing, the live slot `conversation.composer.dock` should report an occupant with id `r4-usage`, and the pill appears under the composer once the page is refreshed.

## Scope

Read-only: the package never changes a limit, a plan, or a key on the r4 side, and it registers no model tool. Only the client-side key form writes anything, and that write goes to the DSH credential store.

## License

MIT
