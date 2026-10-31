window.__ModuleLoader__.load({
  id: '@wha7ever/dsh-r4-usage',
  factory(require) {
    const module = { exports: {} };
    const exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
    const React = require('react');
    const h = React.createElement;

    const NS = 'wha7ev9r.r4Usage';
    const DOCK_SLOT = 'conversation.composer.dock';
    const DOCK_ID = 'r4-usage';
    /** Only used until the first snapshot carries the Host's own interval. */
    const FALLBACK_POLL_MS = 60000;

    const en = {
      loading: 'Loading',
      notConfigured: 'r4 not set',
      plan: 'Plan',
      keyLimit: 'Key limit',
      wallet: 'Wallet',
      today: 'Today',
      remaining: 'remaining',
      used: 'used',
      held: 'in flight',
      expires: 'expires',
      resets: 'resets',
      after: 'later',
      ago: 'ago',
      unlimited: 'No limit',
      overLimit: 'Over limit',
      limitWindow: 'Spend window',
      hourWindow: 'h window',
      dayWindow: 'd window',
      minuteWindow: 'min window',
      planSection: 'Plan budget',
      keySection: 'This API key',
      walletSection: 'Wallet',
      todaySection: 'Today',
      seriesSection: 'Charged, last 7 days',
      modelsSection: 'Models, last 7 days',
      requests: 'requests',
      promptTokens: 'prompt',
      completionTokens: 'completion',
      cacheRead: 'cache read',
      cacheWrite: 'cache write',
      noData: 'No data yet',
      expand: 'Show r4 usage details',
      collapse: 'Hide r4 usage details',
      refresh: 'Refresh',
      refreshing: 'Refreshing',
      updated: 'updated',
      balance: 'balance',
      concurrency: 'max concurrency',
      keyTitle: 'API key',
      keyPlaceholder: 'coder-…',
      keyLabel: 'r4 standard API key',
      keyHint: 'Stored in the DSH credential store, never in a config file.',
      save: 'Save',
      saving: 'Saving',
      changeKey: 'Change key',
      cancel: 'Cancel',
      setupHint: 'Paste a standard r4 key (coder-…) to start reading usage.',
      errors: 'Some data is unavailable',
      errUnauthorized: 'Invalid key, or a monitoring key (a standard key is required)',
      errRateLimited: 'Too many reads; retry shortly',
      errTimezone: 'Invalid time zone; check the plugin timezone',
      errNetwork: 'Cannot reach the usage service',
      errTimeout: 'The usage service timed out',
      errHttp: 'The usage service rejected the request',
      errRpc: 'Local connection to the host failed',
      errInvalidKey: 'The key is too short',
      errKeyWrite: 'The credential store rejected the key',
      errUnknown: 'Unknown error',
      more: 'more',
      hoursUnit: 'h',
      minutesUnit: 'm',
      unitJoin: ' ',
    };
    const zh = {
      loading: '加载中',
      notConfigured: 'r4 未配置',
      plan: '套餐',
      keyLimit: '限额',
      wallet: '钱包',
      today: '今日',
      remaining: '剩余',
      used: '已用',
      held: '在途',
      expires: '到期',
      resets: '重置',
      after: '后',
      ago: '前',
      unlimited: '无上限',
      overLimit: '已超限',
      limitWindow: '限额窗口',
      hourWindow: '小时窗口',
      dayWindow: '天窗口',
      minuteWindow: '分钟窗口',
      planSection: '套餐额度',
      keySection: '本密钥限额',
      walletSection: '钱包',
      todaySection: '今日',
      seriesSection: '近 7 日实收',
      modelsSection: '模型拆分（7 日）',
      requests: '次',
      promptTokens: '提示词',
      completionTokens: '补全',
      cacheRead: '缓存读',
      cacheWrite: '缓存写',
      noData: '暂无数据',
      expand: '展开 r4 用量详情',
      collapse: '收起 r4 用量详情',
      refresh: '刷新',
      refreshing: '刷新中',
      updated: '更新于',
      balance: '余额',
      concurrency: '最大并发',
      keyTitle: '密钥',
      keyPlaceholder: 'coder-…',
      keyLabel: 'r4 标准密钥',
      keyHint: '保存在 DSH 凭据库，不写入配置文件。',
      save: '保存',
      saving: '保存中',
      changeKey: '更换密钥',
      cancel: '取消',
      setupHint: '粘贴 coder- 开头的标准密钥即可读取用量。',
      errors: '部分数据不可用',
      errUnauthorized: '密钥无效，或为监控密钥（需要 Standard Key）',
      errRateLimited: '查询过快，请稍后重试',
      errTimezone: '时区无效，请检查插件的 timezone 配置',
      errNetwork: '无法连接用量服务',
      errTimeout: '连接用量服务超时',
      errHttp: '用量服务拒绝了请求',
      errRpc: '本机连接失败',
      errInvalidKey: '密钥太短',
      errKeyWrite: '凭据库拒绝了这次写入',
      errUnknown: '未知错误',
      more: '个',
      hoursUnit: ' 小时',
      minutesUnit: ' 分',
      unitJoin: ' ',
    };

    const inject = ['connection', 'slots', 'timer', 'locale'];

    const TONE_COLOR = {
      success: 'var(--dsw-alias-state-success-primary)',
      warn: 'var(--dsw-alias-state-warn-primary)',
      error: 'var(--dsw-alias-state-error-primary)',
      idle: 'var(--dsw-alias-state-idle-primary)',
    };

    const FAILURE_KEYS = {
      unauthorized: 'errUnauthorized',
      'monitor-key': 'errUnauthorized',
      'rate-limited': 'errRateLimited',
      'bad-timezone': 'errTimezone',
      network: 'errNetwork',
      timeout: 'errTimeout',
      http: 'errHttp',
      'invalid-body': 'errHttp',
      'invalid-key': 'errInvalidKey',
      'key-read-only': 'errKeyWrite',
      'key-write-failed': 'errKeyWrite',
      rpc: 'errRpc',
      internal: 'errRpc',
      'unknown-endpoint': 'errRpc',
    };

    const CSS = `
.r4u-root { position: relative; display: flex; flex-direction: column; align-items: flex-end; align-self: flex-end; margin-left: auto; gap: 6px; width: auto; max-width: 100%; color: var(--dsw-alias-label-secondary); font-size: 11px; line-height: 1.45; }
.r4u-pill { display: inline-flex; align-items: center; gap: 7px; max-width: 100%; height: 24px; padding: 0 9px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-layer-2); color: inherit; font: inherit; cursor: pointer; transition: background-color .15s ease, border-color .15s ease; }
.r4u-pill:hover { background: var(--dsw-alias-bg-overlay); border-color: var(--dsw-alias-border-l2); }
.r4u-pill:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.r4u-dot { width: 6px; height: 6px; border-radius: 50%; flex: none; }
.r4u-pill-label { white-space: nowrap; }
.r4u-pill-value { color: var(--dsw-alias-label-primary); font-variant-numeric: tabular-nums; white-space: nowrap; }
.r4u-pill-meta { white-space: nowrap; }
.r4u-pill-percent { color: var(--dsw-alias-label-primary); font-variant-numeric: tabular-nums; white-space: nowrap; }
.r4u-pill-bar { display: inline-flex; width: 48px; flex: none; }
.r4u-chevron { font-size: 9px; transition: transform .18s ease; }
.r4u-chevron-open { transform: rotate(180deg); }
.r4u-expand { width: min(340px, 100%); animation: r4u-in .18s ease; }
@keyframes r4u-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
.r4u-card { display: flex; flex-direction: column; gap: 10px; padding: 12px 14px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 12px; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); font-size: 12px; text-align: left; max-height: 320px; overflow-y: auto; overscroll-behavior: contain; }
.r4u-identity { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.r4u-name { font-size: 13px; color: var(--dsw-alias-label-primary); }
.r4u-dim { color: var(--dsw-alias-label-secondary); font-size: 11px; }
.r4u-bar-row { display: flex; flex-direction: column; gap: 4px; }
.r4u-bar-head { display: flex; justify-content: space-between; gap: 8px; }
.r4u-bar { display: block; border-radius: 999px; background: var(--dsw-alias-border-l1); overflow: hidden; }
.r4u-bar-fill { height: 100%; border-radius: 999px; transition: width .25s ease; }
.r4u-hint { color: var(--dsw-alias-label-secondary); font-size: 11px; }
.r4u-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px 12px; }
.r4u-stat { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.r4u-stat-value { color: var(--dsw-alias-label-primary); font-variant-numeric: tabular-nums; }
.r4u-section-title { font-size: 11px; color: var(--dsw-alias-label-secondary); }
.r4u-spark { display: flex; align-items: flex-end; gap: 6px; padding-top: 2px; }
.r4u-spark-col { flex: 1 1 0; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 2px; min-width: 0; }
.r4u-spark-value { font-size: 9px; color: var(--dsw-alias-label-secondary); white-space: nowrap; }
.r4u-spark-track { width: 100%; height: 36px; display: flex; align-items: flex-end; }
.r4u-spark-fill { width: 100%; border-radius: 3px; background: var(--dsw-alias-brand-primary); transition: height .25s ease; }
.r4u-spark-day { font-size: 9px; color: var(--dsw-alias-label-secondary); }
.r4u-models { display: flex; flex-direction: column; gap: 4px; }
.r4u-model-row { display: flex; justify-content: space-between; gap: 12px; }
.r4u-model-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.r4u-footer { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.r4u-btn { border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; padding: 3px 10px; background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 11px; cursor: pointer; }
.r4u-btn:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-1); }
.r4u-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.r4u-btn:disabled { opacity: .5; cursor: default; }
.r4u-input { flex: 1 1 auto; min-width: 0; padding: 5px 8px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 11px; }
.r4u-input:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 0; }
.r4u-key-row { display: flex; gap: 8px; }
.r4u-key-form { display: flex; flex-direction: column; gap: 6px; padding-top: 8px; border-top: 1px solid var(--dsw-alias-border-l1); }
.r4u-error { color: var(--dsw-alias-state-error-primary); font-size: 11px; }
.r4u-errors { display: flex; flex-direction: column; gap: 2px; }
@media (prefers-reduced-motion: reduce) { .r4u-pill, .r4u-chevron, .r4u-expand, .r4u-bar-fill, .r4u-spark-fill { transition: none !important; animation: none !important; } }
`;

    //#region Formatting

    function money(value) {
      if (value === null || value === undefined || !Number.isFinite(value)) return '—';
      const magnitude = Math.abs(value);
      const digits = magnitude > 0 && magnitude < 0.01 ? 4 : 2;
      return `$${value.toFixed(digits)}`;
    }

    function percent(ratio) {
      return `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`;
    }

    function compactCount(value) {
      if (!value) return '0';
      if (value >= 1e6) return `${(value / 1e6).toFixed(value >= 1e7 ? 0 : 1)}M`;
      if (value >= 1e3) return `${Math.round(value / 1e3)}k`;
      return String(value);
    }

    function usedRatio(used, total) {
      if (typeof total !== 'number' || !Number.isFinite(total) || total <= 0) return null;
      if (typeof used !== 'number' || !Number.isFinite(used)) return null;
      return Math.max(0, used / total);
    }

    function remainingRatio(remaining, total) {
      if (typeof remaining !== 'number' || !Number.isFinite(remaining)) return null;
      const used = usedRatio(total - remaining, total);
      return used === null ? null : Math.max(0, 1 - used);
    }

    function usedTone(ratio) {
      if (ratio === null) return 'idle';
      if (ratio >= 1) return 'error';
      if (ratio >= 0.8) return 'warn';
      return 'success';
    }

    function remainingTone(ratio) {
      if (ratio === null) return 'idle';
      if (ratio <= 0.1) return 'error';
      if (ratio <= 0.25) return 'warn';
      return 'success';
    }

    function clock(timestamp) {
      if (!timestamp) return '—';
      const date = new Date(timestamp);
      if (Number.isNaN(date.getTime())) return '—';
      return [date.getHours(), date.getMinutes(), date.getSeconds()]
        .map((part) => String(part).padStart(2, '0'))
        .join(':');
    }

    function calendarDate(iso) {
      if (!iso) return '';
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return '';
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    function relativeTo(iso, t) {
      if (!iso) return null;
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return null;
      const diff = date.getTime() - Date.now();
      const minutes = Math.round(Math.abs(diff) / 60000);
      const hours = Math.floor(minutes / 60);
      const rest = minutes % 60;
      const parts = [];
      if (hours > 0) parts.push(`${hours}${t('hoursUnit')}`);
      if (rest > 0 || hours === 0) parts.push(`${rest}${t('minutesUnit')}`);
      return { label: parts.join(t('unitJoin')), future: diff >= 0 };
    }

    function windowLabel(seconds, t) {
      if (!seconds) return t('limitWindow');
      if (seconds >= 86400) return `${Math.round(seconds / 86400)} ${t('dayWindow')}`;
      if (seconds >= 3600) return `${Math.round(seconds / 3600)} ${t('hourWindow')}`;
      return `${Math.round(seconds / 60)} ${t('minuteWindow')}`;
    }

    function failureText(failure, t, baseUrl) {
      if (!failure) return '';
      const base = t(FAILURE_KEYS[failure.code] || 'errUnknown');
      if (failure.code === 'network' && baseUrl) return `${base} (${baseUrl})`;
      if (failure.status) return `${base} (HTTP ${failure.status})`;
      return base;
    }

    /** Pick the number the pill shows: plan budget, key limit, then wallet. */
    function headline(snapshot, t) {
      if (!snapshot) return { label: t('loading'), text: '', ratio: null, tone: 'idle' };
      if (snapshot.configured === false) return { label: t('notConfigured'), text: '', ratio: null, tone: 'idle' };
      const plan = snapshot.plan;
      if (plan && typeof plan.totalUsd === 'number' && plan.totalUsd > 0 && typeof plan.remainingUsd === 'number') {
        const ratio = remainingRatio(plan.remainingUsd, plan.totalUsd);
        return { label: t('plan'), text: money(plan.remainingUsd), ratio, tone: remainingTone(ratio) };
      }
      const limit = snapshot.keyLimit;
      if (limit && typeof limit.limitUsd === 'number' && limit.limitUsd > 0) {
        const remaining =
          typeof limit.remainingUsd === 'number' ? limit.remainingUsd : limit.limitUsd - (limit.spentUsd + limit.heldUsd);
        const ratio = remainingRatio(remaining, limit.limitUsd);
        return { label: t('keyLimit'), text: money(remaining), ratio, tone: remainingTone(ratio) };
      }
      if (snapshot.wallet && typeof snapshot.wallet.balanceUsd === 'number') {
        return { label: t('wallet'), text: money(snapshot.wallet.balanceUsd), ratio: null, tone: 'idle' };
      }
      if (plan && typeof plan.remainingUsd === 'number') {
        return { label: t('plan'), text: money(plan.remainingUsd), ratio: null, tone: 'idle' };
      }
      return { label: t('noData'), text: '', ratio: null, tone: 'idle' };
    }

    //#endregion

    function apply(ctx) {
      const t = ctx.locale.bind(NS);
      ctx.effect(() => ctx.locale.register(NS, { en, zh }), '@wha7ever/dsh-r4-usage: dictionaries');

      const rpc = async (endpoint, payload) => {
        const result = await ctx.connection.rpc.call('/api', 'r4-usage', {
          endpoint,
          payload: payload === undefined ? {} : payload,
        });
        if (!result.ok) {
          const failure = result.error || {};
          const error = new Error(failure.message || 'RPC failed');
          error.code = failure.code || 'internal';
          throw error;
        }
        return result.value;
      };

      function useLocaleRevision() {
        const [, setRevision] = React.useState(0);
        React.useEffect(() => ctx.locale.subscribe(() => setRevision(ctx.locale.getSnapshot().revision)), []);
      }

      function useUsageData() {
        const [state, setState] = React.useState({ data: null, busy: true, error: null });
        const [period, setPeriod] = React.useState(0);
        const alive = React.useRef(true);
        const periodRef = React.useRef(0);
        const load = React.useCallback(async (force) => {
          setState((prev) => ({ ...prev, busy: true }));
          try {
            const value = await rpc('snapshot', { force: force === true });
            if (!alive.current) return;
            setState({ data: value, busy: false, error: value.error || null });
            // The Host owns the poll interval; the browser reads it from the snapshot.
            const next = Number(value?.refreshMs);
            if (Number.isFinite(next) && next >= 1000 && next !== periodRef.current) {
              periodRef.current = next;
              setPeriod(next);
            }
          } catch (cause) {
            if (!alive.current) return;
            const failure = { code: cause?.code || 'rpc', status: null, message: '' };
            setState((prev) => ({ ...prev, busy: false, error: failure }));
          }
        }, []);
        React.useEffect(() => {
          alive.current = true;
          load(false);
          return () => {
            alive.current = false;
          };
        }, []);
        React.useEffect(() => {
          const dispose = ctx.interval(() => load(false), period || FALLBACK_POLL_MS);
          return () => dispose();
        }, [period]);
        return { ...state, refresh: load };
      }

      function Bar({ value, tone, label, height }) {
        const ratio = Math.max(0, Math.min(1, value));
        return h(
          'span',
          {
            role: 'progressbar',
            'aria-valuemin': 0,
            'aria-valuemax': 100,
            'aria-valuenow': Math.round(ratio * 100),
            'aria-label': label,
            className: 'r4u-bar',
            style: { height: height || 6 },
          },
          h('span', {
            className: 'r4u-bar-fill',
            style: { display: 'block', width: `${ratio * 100}%`, background: TONE_COLOR[tone] || TONE_COLOR.idle },
          }),
        );
      }

      function barRow(key, label, ratio, hint, t) {
        return h(
          'div',
          { key, className: 'r4u-bar-row' },
          h(
            'div',
            { className: 'r4u-bar-head' },
            h('span', null, label),
            h('span', { className: 'r4u-dim' }, ratio === null ? t('unlimited') : `${percent(ratio)} ${t('used')}`),
          ),
          ratio === null ? null : h(Bar, { value: ratio, tone: usedTone(ratio), label }),
          hint ? h('div', { className: 'r4u-hint' }, hint) : null,
        );
      }

      function stat(key, label, value) {
        return h(
          'div',
          { key, className: 'r4u-stat' },
          h('span', { className: 'r4u-dim' }, label),
          h('span', { className: 'r4u-stat-value' }, value),
        );
      }

      function Detail(props) {
        const { snapshot, busy, saving, saveError, draft, setDraft, keyForm, onRefresh, onSave, onToggleKeyForm } = props;
        const inputId = React.useId();
        const hintId = `${inputId}-hint`;
        const plan = snapshot.plan;
        const keyLimit = snapshot.keyLimit;
        const wallet = snapshot.wallet;
        const today = snapshot.today;
        const series = Array.isArray(snapshot.series) ? snapshot.series : [];
        const models = Array.isArray(snapshot.models) ? snapshot.models : [];
        const needsKey = snapshot.configured === false;

        const planUsed =
          plan && typeof plan.totalUsd === 'number' && typeof plan.remainingUsd === 'number'
            ? usedRatio(plan.totalUsd - plan.remainingUsd, plan.totalUsd)
            : null;
        const keyUsed = keyLimit ? usedRatio(keyLimit.spentUsd + keyLimit.heldUsd, keyLimit.limitUsd) : null;

        const blocks = [];

        blocks.push(
          h(
            'div',
            { key: 'identity', className: 'r4u-identity' },
            h('span', { className: 'r4u-name' }, snapshot.identity?.name || t('keyTitle')),
            snapshot.identity?.start ? h('span', { className: 'r4u-dim' }, snapshot.identity.start) : null,
            plan && plan.name ? h('span', { className: 'r4u-dim' }, `· ${plan.name}`) : null,
            snapshot.day ? h('span', { className: 'r4u-dim' }, `· ${snapshot.day}`) : null,
          ),
        );

        if (plan && planUsed !== null) {
          const expires = calendarDate(plan.expiresAt);
          const hint = [
            `${t('remaining')} ${money(plan.remainingUsd)} / ${money(plan.totalUsd)}`,
            expires ? `${t('expires')} ${expires}` : null,
            planUsed > 1 ? t('overLimit') : null,
          ]
            .filter(Boolean)
            .join(' · ');
          blocks.push(barRow('plan-bar', t('planSection'), planUsed, hint, t));
        } else if (plan && typeof plan.remainingUsd === 'number') {
          blocks.push(
            h(
              'div',
              { key: 'plan-plain', className: 'r4u-bar-row' },
              h('div', { className: 'r4u-bar-head' }, h('span', null, t('planSection')), h('span', { className: 'r4u-dim' }, money(plan.remainingUsd))),
              plan.expiresAt ? h('div', { className: 'r4u-hint' }, `${t('expires')} ${calendarDate(plan.expiresAt)}`) : null,
            ),
          );
        }

        if (plan && Array.isArray(plan.windows)) {
          plan.windows.forEach((window, index) => {
            const ratio = usedRatio(window.consumedUsd, window.ceilingUsd);
            const rel = relativeTo(window.resetsAt, t);
            const hintParts = [
              `${t('used')} ${money(window.consumedUsd)}${typeof window.ceilingUsd === 'number' ? ` / ${money(window.ceilingUsd)}` : ''}`,
              rel ? `${t('resets')} ${rel.label}${rel.future ? t('after') : t('ago')}` : null,
              ratio !== null && ratio > 1 ? t('overLimit') : null,
            ].filter(Boolean);
            blocks.push(barRow(`window-${index}`, windowLabel(window.seconds, t), ratio, hintParts.join(' · '), t));
          });
        }

        if (keyLimit) {
          const hint = [
            `${t('used')} ${money(keyLimit.spentUsd)} + ${t('held')} ${money(keyLimit.heldUsd)}`,
            typeof keyLimit.limitUsd === 'number' ? `/ ${money(keyLimit.limitUsd)}` : t('unlimited'),
            keyUsed !== null && keyUsed > 1 ? t('overLimit') : null,
          ].filter(Boolean).join(' ');
          blocks.push(barRow('key-limit', t('keySection'), keyUsed, hint, t));
        }

        if (wallet && typeof wallet.balanceUsd === 'number') {
          blocks.push(
            h(
              'div',
              { key: 'wallet', className: 'r4u-bar-head' },
              h('span', null, `${t('walletSection')} · ${t('balance')}`),
              h(
                'span',
                { className: 'r4u-stat-value' },
                `${money(wallet.balanceUsd)}${wallet.maxConcurrency ? ` · ${t('concurrency')} ${wallet.maxConcurrency}` : ''}`,
              ),
            ),
          );
        }

        if (today) {
          blocks.push(
            h(
              'div',
              { key: 'today', className: 'r4u-bar-row' },
              h(
                'div',
                { className: 'r4u-bar-head' },
                h('span', { className: 'r4u-section-title' }, t('todaySection')),
                h('span', { className: 'r4u-dim' }, `${money(today.chargedUsd)} · ${today.requests} ${t('requests')}`),
              ),
              h(
                'div',
                { className: 'r4u-grid' },
                stat('prompt', t('promptTokens'), compactCount(today.promptTokens)),
                stat('completion', t('completionTokens'), compactCount(today.completionTokens)),
                stat('cache-read', t('cacheRead'), compactCount(today.cacheReadTokens)),
                stat('cache-write', t('cacheWrite'), compactCount(today.cacheCreationTokens)),
              ),
            ),
          );
        }

        if (series.length) {
          const peak = series.reduce((max, point) => Math.max(max, point.chargedUsd), 0);
          const peakIndex = series.reduce((best, point, index) => (point.chargedUsd > series[best].chargedUsd ? index : best), 0);
          const seriesLabel = `${t('seriesSection')}: ${series
            .map((point) => `${point.day ? point.day.slice(5) : ''} ${money(point.chargedUsd)}`)
            .join(', ')}`;
          blocks.push(
            h(
              'div',
              { key: 'series', className: 'r4u-bar-row' },
              h(
                'div',
                { className: 'r4u-bar-head' },
                h('span', { className: 'r4u-section-title' }, t('seriesSection')),
                h('span', { className: 'r4u-dim' }, money(series.reduce((sum, point) => sum + point.chargedUsd, 0))),
              ),
              h(
                'div',
                { className: 'r4u-spark', role: 'img', 'aria-label': seriesLabel },
                series.map((point, index) =>
                  h(
                    'div',
                    { key: point.day || index, className: 'r4u-spark-col', 'aria-hidden': true },
                    h('span', { className: 'r4u-spark-value' }, peak > 0 && index === peakIndex ? money(point.chargedUsd) : ''),
                    h(
                      'div',
                      { className: 'r4u-spark-track' },
                      h('div', {
                        className: 'r4u-spark-fill',
                        style: {
                          height: `${peak > 0 ? Math.max(4, Math.round((point.chargedUsd / peak) * 36)) : 4}px`,
                          opacity: point.chargedUsd > 0 ? 1 : 0.25,
                        },
                      }),
                    ),
                    h('span', { className: 'r4u-spark-day' }, point.day ? point.day.slice(8) : ''),
                  ),
                ),
              ),
            ),
          );
        }

        if (models.length) {
          blocks.push(
            h(
              'div',
              { key: 'models', className: 'r4u-bar-row' },
              h('span', { className: 'r4u-section-title' }, t('modelsSection')),
              h(
                'div',
                { className: 'r4u-models' },
                models.slice(0, 4).map((model) =>
                  h(
                    'div',
                    { key: model.slug || model.name, className: 'r4u-model-row' },
                    h('span', { className: 'r4u-model-name' }, model.name),
                    h('span', { className: 'r4u-dim' }, `${money(model.chargedUsd)} · ${model.requests} ${t('requests')}`),
                  ),
                ),
                models.length > 4 ? h('div', { className: 'r4u-hint' }, `+${models.length - 4} ${t('more')}`) : null,
              ),
            ),
          );
        }

        const failures = [...(snapshot.error ? [snapshot.error] : []), ...(Array.isArray(snapshot.partialErrors) ? snapshot.partialErrors : [])];
        if (failures.length) {
          blocks.push(
            h(
              'div',
              { key: 'failures', className: 'r4u-errors', role: 'status' },
              h('span', { className: 'r4u-error' }, t('errors')),
              failures.map((failure, index) =>
                h('span', { key: `${failure.code}-${index}`, className: 'r4u-dim' }, failureText(failure, t, snapshot.baseUrl)),
              ),
            ),
          );
        }

        if (needsKey || keyForm) {
          blocks.push(
            h(
              'form',
              {
                key: 'key-form',
                className: 'r4u-key-form',
                onSubmit: (event) => {
                  event.preventDefault();
                  onSave(draft);
                },
              },
              needsKey ? h('div', { className: 'r4u-hint' }, t('setupHint')) : null,
              h('label', { className: 'r4u-dim', htmlFor: inputId }, t('keyLabel')),
              h(
                'div',
                { className: 'r4u-key-row' },
                h('input', {
                  id: inputId,
                  className: 'r4u-input',
                  type: 'password',
                  value: draft,
                  placeholder: t('keyPlaceholder'),
                  autoComplete: 'off',
                  spellCheck: false,
                  'aria-describedby': hintId,
                  onChange: (event) => setDraft(event.target.value),
                }),
                h(
                  'button',
                  { className: 'r4u-btn', type: 'submit', disabled: saving },
                  saving ? t('saving') : t('save'),
                ),
                needsKey
                  ? null
                  : h('button', { className: 'r4u-btn', type: 'button', onClick: onToggleKeyForm, disabled: saving }, t('cancel')),
              ),
              h('div', { className: 'r4u-hint', id: hintId }, t('keyHint')),
              saveError ? h('div', { className: 'r4u-error', role: 'alert' }, saveError) : null,
            ),
          );
        }

        blocks.push(
          h(
            'div',
            { key: 'footer', className: 'r4u-footer' },
            h('span', { className: 'r4u-dim' }, `${t('updated')} ${clock(snapshot.fetchedAt)}`),
            h('button', { className: 'r4u-btn', type: 'button', onClick: onRefresh, disabled: busy }, busy ? t('refreshing') : t('refresh')),
            needsKey ? null : h('button', { className: 'r4u-btn', type: 'button', onClick: onToggleKeyForm }, t('changeKey')),
          ),
        );

        return h('div', { className: 'r4u-card' }, blocks);
      }

      function UsageCard() {
        useLocaleRevision();
        const data = useUsageData();
        const [expanded, setExpanded] = React.useState(false);
        const [draft, setDraft] = React.useState('');
        const [saving, setSaving] = React.useState(false);
        const [saveError, setSaveError] = React.useState(null);
        const [keyForm, setKeyForm] = React.useState(false);

        const snapshot = data.data;
        const view = headline(snapshot, t);
        const failure = snapshot?.error || data.error || null;
        const tone = failure ? 'error' : view.tone;
        const todayUsd = snapshot?.today ? snapshot.today.chargedUsd : null;
        const pillLabel = [
          view.label,
          view.ratio === null ? null : percent(view.ratio),
          view.text,
          todayUsd === null || todayUsd === undefined ? null : `${t('today')} ${money(todayUsd)}`,
          failure ? failureText(failure, t, snapshot?.baseUrl) : null,
        ]
          .filter(Boolean)
          .join(' · ');

        const save = async (value) => {
          setSaving(true);
          setSaveError(null);
          try {
            await rpc('setKey', { key: String(value || '').trim() });
            setDraft('');
            setKeyForm(false);
            await data.refresh(true);
          } catch (cause) {
            setSaveError(failureText({ code: cause?.code, status: null, message: '' }, t, null));
          } finally {
            setSaving(false);
          }
        };

        return h(
          'div',
          { className: 'r4u-root' },
          h('style', null, CSS),
          h(
            'button',
            {
              type: 'button',
              className: 'r4u-pill',
              onClick: () => setExpanded((value) => !value),
              'aria-expanded': expanded,
              'aria-busy': data.busy || undefined,
              'aria-label': pillLabel || undefined,
              title: failure ? failureText(failure, t, snapshot?.baseUrl) : expanded ? t('collapse') : t('expand'),
            },
            h('span', { className: 'r4u-dot', 'aria-hidden': true, style: { background: TONE_COLOR[tone] } }),
            h('span', { className: 'r4u-pill-label' }, view.label),
            view.ratio === null ? null : h('span', { className: 'r4u-pill-percent' }, percent(view.ratio)),
            view.ratio === null
              ? null
              : h('span', { className: 'r4u-pill-bar', 'aria-hidden': true }, h(Bar, { value: view.ratio, tone, label: view.label, height: 4 })),
            view.text ? h('span', { className: 'r4u-pill-value' }, view.text) : null,
            h('span', { className: 'r4u-chevron' + (expanded ? ' r4u-chevron-open' : ''), 'aria-hidden': true }, '▾'),
          ),
          expanded && snapshot
            ? h(
                'div',
                {
                  className: 'r4u-expand',
                  onKeyDown: (event) => {
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      setExpanded(false);
                    }
                  },
                },
                h(Detail, {
                  snapshot,
                  busy: data.busy,
                  saving,
                  saveError,
                  draft,
                  setDraft,
                  keyForm,
                  onRefresh: () => data.refresh(true),
                  onSave: save,
                  onToggleKeyForm: () => {
                    setKeyForm((value) => !value);
                    setSaveError(null);
                  },
                }),
              )
            : null,
        );
      }

      ctx.slots.inject(DOCK_SLOT, () =>
        ctx.slots.register(
          {
            name: DOCK_SLOT,
            id: DOCK_ID,
            order: 2,
            locale: NS,
          },
          UsageCard,
        ),
      );
    }

    exports.inject = inject;
    exports.apply = apply;
    return module.exports;
  },
});
