// Wire-normalization checks for the r4 usage dashboard.
//
// The Host half is the only place that reads the documented /v1/cli shapes, so
// these cases pin the string-to-number conversion, the meaning of every null,
// the model roll-up, and the failure codes the browser localizes. No network:
// the checks run against the documented sample bodies.
import {
  describeFailure,
  describeTransportError,
  normalizeConfig,
  normalizeIdentity,
  normalizeKey,
  normalizeMeta,
  normalizeSeries,
  normalizeUsage,
} from '../lib/index.js'

const failures = []
const check = (condition, message) => {
  if (!condition) failures.push(message)
  console.log(`${condition ? 'ok  ' : 'FAIL'}  ${message}`)
}

const emptySeriesDay = {
  bucket: '2026-09-25',
  request_count: 0,
  charged_usd_total: '0',
  prompt_tokens_total: null,
  completion_tokens_total: null,
  cache_read_tokens_total: null,
  cache_creation_tokens_total: null,
}
const lastSeriesDay = {
  bucket: '2026-10-01',
  request_count: 41,
  charged_usd_total: '2.847100',
  prompt_tokens_total: 812044,
  completion_tokens_total: 30187,
  cache_read_tokens_total: 2109550,
  cache_creation_tokens_total: 95301,
}
const keyBody = {
  key: { name: 'claude-code-laptop', start: 'coder_9f24…' },
  limit_usd: '20.000000',
  spent_usd: '7.200000',
  held_usd: '0.100000',
  remaining_usd: '12.700000',
  day: '2026-10-01',
  refresh_after_ms: 60000,
  today: {
    request_count: 18,
    charged_usd_total: '1.204500',
    prompt_tokens_total: 412033,
    completion_tokens_total: 15820,
    cache_read_tokens_total: 1024403,
    cache_creation_tokens_total: 21458,
  },
  series: [emptySeriesDay, emptySeriesDay, emptySeriesDay, emptySeriesDay, emptySeriesDay, lastSeriesDay, lastSeriesDay],
}
const usageBody = {
  day: '2026-10-01',
  today: keyBody.today,
  series: keyBody.series,
  models: [
    {
      model_slug: 'glm-5.3',
      model_display_name: 'GLM 5.3',
      points: [
        { bucket: '2026-09-30', request_count: 3, charged_usd_total: '0.500000' },
        { bucket: '2026-10-01', request_count: 18, charged_usd_total: '1.204500' },
      ],
    },
    {
      model_slug: 'deepseek-v4.1-flash',
      points: [{ bucket: '2026-10-01', request_count: 4, charged_usd_total: '0.050000' }],
    },
    { model_slug: 'unused-model', model_display_name: 'Unused', points: [] },
  ],
}
const metaBody = {
  key: { name: 'r4-cli', start: 'coder_9f24…' },
  plan: {
    package_name: 'Mini',
    remaining_usd: '3.402500',
    total_usd: '10.000000',
    max_concurrency: 5,
    expires_at: '2026-10-07T00:00:00.000Z',
    limit_windows: [
      { duration_seconds: 18000, ceiling_usd: 5, consumed_usd: 1.2, remaining_usd: 3.8, resets_at: '2026-10-01T14:30:00.000Z' },
      { duration_seconds: 604800, ceiling_usd: null, consumed_usd: 6.6, remaining_usd: null, resets_at: null },
    ],
    grant_count: 1,
    grants: [{ package_name: 'Mini', remaining_usd: '3.402500', total_usd: '10.000000', expires_at: '2026-10-07T00:00:00.000Z' }],
  },
  wallet: { balance_usd: '2.150000', max_concurrency: 3 },
  latest_cli_version: '0.13.0',
  default_model: 'glm-5.3',
}

// /v1/cli/key ---------------------------------------------------------------
const key = normalizeKey(keyBody)
check(key.limitUsd === 20, 'limit_usd becomes a number')
check(key.spentUsd === 7.2 && key.heldUsd === 0.1, 'spent and held stay separate counters')
check(key.remainingUsd === 12.7, 'remaining_usd is read, not recomputed')
check(key.day === '2026-10-01', 'day is passed through')
check(key.today.requests === 18, 'today.request_count is read')
check(Math.abs(key.today.chargedUsd - 1.2045) < 1e-9, 'today.charged_usd_total is numeric')
check(key.series.length === 7, 'series keeps its seven buckets')
check(normalizeKey({ today: { request_count: null, charged_usd_total: null, prompt_tokens_total: null } }).today.promptTokens === 0, 'a null token window counts as zero')
check(key.series[0].requests === 0 && key.series[0].chargedUsd === 0, 'a zero-filled bucket stays zero')
check(key.series[5].requests === 41, 'series request_count is read')

const anchored = normalizeKey({ day: '2026-10-01' })
check(anchored.series.length === 7, 'an absent series is padded to seven buckets')
check(anchored.series[0].day === '2026-09-25' && anchored.series[6].day === '2026-10-01', 'padding runs backwards from the response day')
const shortSeries = normalizeKey({ ...keyBody, series: [lastSeriesDay, lastSeriesDay] })
check(shortSeries.series.length === 7 && shortSeries.series[5].day === '2026-10-01', 'a short series is padded from its last bucket')
check(normalizeSeries([], undefined).length === 0, 'an undated empty series stays empty')
check(normalizeSeries([], '2026-10-01').length === 7, 'an undated empty series pads from the response day')
check(normalizeSeries(Array.from({ length: 9 }, () => lastSeriesDay)).length === 7, 'a long series keeps its newest seven buckets')

const unlimited = normalizeKey({ ...keyBody, limit_usd: null, remaining_usd: null })
check(unlimited.limitUsd === null, 'an unlimited key keeps a null limit')
check(unlimited.remainingUsd === null, 'an unlimited key has no remaining number')
check(unlimited.spentUsd === 7.2, 'an unlimited key still reports spend')

const overspent = normalizeKey({ ...keyBody, spent_usd: '20.500000', remaining_usd: '-0.500000' })
check(overspent.remainingUsd === -0.5, 'a negative remaining value is preserved')
const emptyKey = normalizeKey({})
check(emptyKey.today.requests === 0 && emptyKey.series.length === 0, 'an empty body normalizes to zeros')
check(emptyKey.day === null && emptyKey.limitUsd === null, 'missing fields stay null')

// /v1/cli/usage -------------------------------------------------------------
const usage = normalizeUsage(usageBody)
check(usage.day === '2026-10-01', 'usage carries the account day')
check(usage.models.length === 2, 'models without any charge are dropped')
check(usage.models[0].slug === 'glm-5.3', 'models sort by charged amount, highest first')
check(Math.abs(usage.models[0].chargedUsd - 1.7045) < 1e-9, 'model points roll up to one charge')
check(usage.models[0].requests === 21, 'model points roll up to one request count')
check(usage.models[1].name === 'deepseek-v4.1-flash', 'a missing display name falls back to the slug')
check(normalizeUsage({}).models.length === 0, 'an empty usage body has no models')

// /v1/cli/meta --------------------------------------------------------------
const meta = normalizeMeta(metaBody)
check(meta.identity.name === 'r4-cli', 'meta carries the key identity')
check(meta.plan.name === 'Mini' && meta.plan.remainingUsd === 3.4025, 'plan budget is read')
check(meta.plan.totalUsd === 10 && meta.plan.expiresAt === '2026-10-07T00:00:00.000Z', 'plan total and expiry are read')
check(meta.plan.windows.length === 2, 'every spend window is kept')
check(meta.plan.windows[0].seconds === 18000 && meta.plan.windows[0].ceilingUsd === 5, 'window duration and ceiling are read')
check(meta.plan.windows[1].ceilingUsd === null, 'an unlimited window keeps a null ceiling')
check(meta.plan.windows[0].resetsAt === '2026-10-01T14:30:00.000Z', 'a window reset time is read')
check(meta.wallet.balanceUsd === 2.15 && meta.wallet.maxConcurrency === 3, 'wallet balance and concurrency are read')
check(normalizeMeta({}).plan === null && normalizeMeta({}).wallet === null, 'absent plan and wallet stay null')
check(normalizeIdentity({ key: {} }).name === null, 'an unnamed key normalizes to null')

// Failures ------------------------------------------------------------------
check(describeFailure(403, { error: { code: 'STANDARD_KEY_REQUIRED' } }).code === 'monitor-key', 'a monitoring key maps to monitor-key')
check(describeFailure(429, { error: { code: 'CLI_RATE_LIMITED' } }).code === 'rate-limited', 'CLI_RATE_LIMITED maps to rate-limited')
check(describeFailure(429, {}).code === 'rate-limited', 'a bare 429 maps to rate-limited')
check(describeFailure(400, { error: { code: 'INVALID_TIME_ZONE' } }).code === 'bad-timezone', 'INVALID_TIME_ZONE maps to bad-timezone')
check(describeFailure(401, {}).code === 'unauthorized', 'a bare 401 maps to unauthorized')
check(describeFailure(500, {}).code === 'http' && describeFailure(500, {}).status === 500, 'any other status maps to http with its code')
check(describeTransportError(Object.assign(new Error('boom'), { name: 'TimeoutError' })).code === 'timeout', 'a timeout is not a network failure')
check(describeTransportError(new TypeError('fetch failed')).code === 'network', 'a transport error maps to network')

// Configuration -------------------------------------------------------------
const defaults = normalizeConfig()
check(defaults.baseUrl === 'https://api.r4.codes', 'the documented host is the default')
check(defaults.apiKeyEnv === 'R4_API_KEY', 'the default credential reference is R4_API_KEY')
check(defaults.timezone === 'Asia/Shanghai', 'the default time zone is Asia/Shanghai')
check(defaults.refreshMs === 60000, 'the default poll is one minute')
const configured = normalizeConfig({ baseUrl: 'https://example.test/', refreshMs: 2000, timezone: 'UTC', apiKeyEnv: 'OTHER_KEY' })
check(configured.baseUrl === 'https://example.test', 'trailing slashes are trimmed from baseUrl')
check(configured.refreshMs === 15000, 'refreshMs is floored to fifteen seconds')
check(configured.timezone === 'UTC' && configured.apiKeyEnv === 'OTHER_KEY', 'timezone and credential reference are overridable')

if (failures.length) {
  console.error(`\n${failures.length} failure(s)`)
  process.exitCode = 1
} else {
  console.log('\nall checks passed')
}
