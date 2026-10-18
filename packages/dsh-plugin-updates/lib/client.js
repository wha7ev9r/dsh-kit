window.__ModuleLoader__.load({
  id: '@wha7ever/dsh-plugin-updates',
  factory(require) {
    const module = { exports: {} };
    const exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
    const React = require('react');
    const h = React.createElement;

    /** Locale namespace owned by this plugin. */
    const NS = 'wha7ev9r.pluginUpdates';
    /** RPC channel the Host half registered. */
    const RPC_CHANNEL = 'plugin-updates';
    /** Local storage key for versions the person chose to ignore. */
    const IGNORED_KEY = 'dsh-plugin-updates.ignored.v1';

    const en = {
      title: 'Updates',
      checking: 'Checking…',
      checkNow: 'Check now',
      lastChecked: 'Last checked {time}',
      neverChecked: 'Not checked yet',
      updatesFound: '{count} updates available',
      allCurrent: 'Everything is up to date',
      summary: '{third} third-party · {official} official',
      official: 'Official',
      sectionUpdates: 'Available updates',
      sectionUnknown: 'Could not check',
      sectionCurrent: 'Up to date',
      sectionIgnored: 'Ignored versions',
      copyCommand: 'Copy update command',
      copied: 'Copied',
      openDetails: 'Open details',
      ignore: 'Ignore this version',
      restore: 'Restore',
      via: 'via {source}',
      tagNpm: 'npm',
      tagGit: 'Git',
      tagUpdate: 'update',
      reasonLocal: 'Installed from a local path; cannot check automatically.',
      reasonTarball: 'Installed from a tarball; cannot check automatically.',
      reasonGit: 'Git install; the repository version could not be read.',
      reasonPrivate: 'The registry requires authentication.',
      reasonNotFound: 'The package was not found in the checked sources.',
      reasonNetwork: 'The metadata sources could not be reached.',
      reasonNoVersion: 'The installed version could not be read.',
      reasonInvalid: 'The recorded source is not a form the checker understands.',
      reasonRange: 'The profile records a range; the target is the latest version.',
      errorTitle: 'The check failed',
      errorStale: 'Showing the last successful result.',
      retry: 'Retry',
      disabled: 'Update checking is disabled in this profile.',
      unavailableSources: 'Some sources are unavailable: {sources}',
      sourcesUsed: 'Sources: {sources}',
      officialCurrent: 'Official plugins are current with DSH {version}',
      officialHint: 'Official plugins ship with DSH. Update the desktop app, not an individual package.',
      officialLink: 'Release notes',
      badgeUpdate: 'Update {version}',
      badgeOfficial: 'DSH {version}',
      detailCurrent: 'Installed version',
      detailLatest: 'Latest version',
      detailStatus: 'Status',
      detailSource: 'Source',
      detailCheckedFrom: 'Checked via',
      detailCheckedAt: 'Checked',
      detailCommand: 'Update command',
      detailHint: 'Run the command and restart DSH. The Plugins page refuses to reinstall an already-installed bundle, so use this command or uninstall and reinstall from the detail page.',
      detailNoUpdate: 'No update available.',
      detailUnknown: 'This source cannot be checked automatically.',
      emptyTitle: 'Everything is up to date',
      emptyHint: 'The checker runs in the background after DSH starts.',
      unknownCount: '{count} plugins could not be checked',
      ignoredCount: '{count} ignored',
      current: 'Up to date',
      update: 'Update',
      unknown: 'Unknown',
    };

    const zh = {
      title: '更新',
      checking: '检查中…',
      checkNow: '立即检查',
      lastChecked: '上次检查 {time}',
      neverChecked: '尚未检查',
      updatesFound: '{count} 个插件可更新',
      allCurrent: '全部已是最新',
      summary: '第三方 {third} · 官方 {official}',
      official: '官方',
      sectionUpdates: '可更新',
      sectionUnknown: '无法检查',
      sectionCurrent: '已是最新',
      sectionIgnored: '已忽略版本',
      copyCommand: '复制更新命令',
      copied: '已复制',
      openDetails: '查看详情',
      ignore: '忽略此版本',
      restore: '恢复',
      via: '来源：{source}',
      tagNpm: 'npm',
      tagGit: 'Git',
      tagUpdate: '可更新',
      reasonLocal: '本地安装，无法自动检查。',
      reasonTarball: '压缩包安装，无法自动检查。',
      reasonGit: 'Git 安装，未能读取仓库版本。',
      reasonPrivate: '安装源需要认证。',
      reasonNotFound: '在检查的源中找不到该包。',
      reasonNetwork: '无法连接元数据源。',
      reasonNoVersion: '读不到已安装版本。',
      reasonInvalid: '记录的安装来源无法识别。',
      reasonRange: 'profile 记录的是版本范围，目标取最新版本。',
      errorTitle: '检查失败',
      errorStale: '正在显示上次成功结果。',
      retry: '重试',
      disabled: '当前 profile 已关闭更新检查。',
      unavailableSources: '部分源不可用：{sources}',
      sourcesUsed: '数据源：{sources}',
      officialCurrent: '官方插件已随 DSH {version} 最新',
      officialHint: '官方插件随 DSH 发布，请更新桌面版，而不是单独更新某个包。',
      officialLink: '发布说明',
      badgeUpdate: '可更新 {version}',
      badgeOfficial: '随 DSH {version}',
      detailCurrent: '当前版本',
      detailLatest: '最新版本',
      detailStatus: '状态',
      detailSource: '来源',
      detailCheckedFrom: '检查源',
      detailCheckedAt: '检查时间',
      detailCommand: '更新命令',
      detailHint: '执行命令后重启 DSH。插件页不允许直接重装已安装的包，可用该命令，或在详情页卸载后重装。',
      detailNoUpdate: '没有可用更新。',
      detailUnknown: '该来源无法自动检查。',
      emptyTitle: '全部已是最新',
      emptyHint: 'DSH 启动后会在后台自动检查。',
      unknownCount: '{count} 个插件无法自动检查',
      ignoredCount: '已忽略 {count} 个',
      current: '已是最新',
      update: '更新',
      unknown: '未知',
    };

    const inject = ['connection', 'slots', 'locale', 'remote', 'remote.pluginManager'];

    const CSS = `
.dsh-updates-root{display:flex;flex-direction:column;gap:16px;min-width:0}
.dsh-updates-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.dsh-updates-head-text{display:flex;flex-direction:column;gap:4px;min-width:0}
.dsh-updates-title{margin:0;font-size:20px;line-height:28px;font-weight:500;color:var(--dsw-alias-label-primary)}
.dsh-updates-sub{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.dsh-updates-muted{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.dsh-updates-actions{display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap}
.dsh-updates-button{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:4px 11px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:20px;cursor:pointer;transition:background-color 120ms ease,border-color 120ms ease,color 120ms ease}
.dsh-updates-button:hover{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l2)}
.dsh-updates-button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.dsh-updates-button:disabled{opacity:.55;cursor:default}
.dsh-updates-button-accent{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.dsh-updates-section{display:flex;flex-direction:column;gap:8px;min-width:0}
.dsh-updates-section-title{margin:0;font-size:14px;line-height:20px;font-weight:500;color:var(--dsw-alias-label-primary)}
.dsh-updates-count{font-weight:400;color:var(--dsw-alias-label-secondary)}
.dsh-updates-list{display:flex;flex-direction:column;gap:6px;margin:0;padding:0;list-style:none}
.dsh-updates-row{display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);min-width:0;transition:border-color 120ms ease,background-color 120ms ease}
.dsh-updates-row:hover{border-color:var(--dsw-alias-border-l2)}
.dsh-updates-row-main{display:flex;flex:1;flex-direction:column;gap:2px;min-width:0}
.dsh-updates-name{font-size:14px;line-height:20px;font-weight:500;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}
.dsh-updates-subname{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.dsh-updates-desc{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-updates-meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.dsh-updates-version{display:inline-flex;align-items:center;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;padding:0 5px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;line-height:18px;font-variant-numeric:tabular-nums}
.dsh-updates-version-target{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.dsh-updates-arrow{color:var(--dsw-alias-label-secondary);font-size:12px}
.dsh-updates-tags{display:inline-flex;flex-wrap:wrap;align-items:center;gap:4px;flex:none}
.dsh-updates-tag{display:inline-flex;align-items:center;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;padding:0 8px;font-size:11px;line-height:18px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.dsh-updates-tag-update{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.dsh-updates-tag-official{border-color:var(--dsw-alias-state-success-primary);color:var(--dsw-alias-state-success-primary)}
.dsh-updates-badge{display:inline-flex;align-items:center;border:1px solid var(--dsw-alias-brand-primary);border-radius:999px;padding:0 8px;font-size:11px;line-height:18px;font-weight:500;color:var(--dsw-alias-brand-primary);white-space:nowrap}
.dsh-updates-banner{display:flex;align-items:flex-start;gap:8px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-2);font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.dsh-updates-banner-error{border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary)}
.dsh-updates-banner-warn{border-color:var(--dsw-alias-state-warn-primary)}
.dsh-updates-banner-main{display:flex;flex-direction:column;gap:2px;min-width:0}
.dsh-updates-banner strong{font-weight:500;color:var(--dsw-alias-label-primary)}
.dsh-updates-details{border:1px solid var(--dsw-alias-border-l1);border-radius:12px;padding:8px 12px;background:transparent}
.dsh-updates-details>summary{cursor:pointer;font-size:12px;line-height:20px;color:var(--dsw-alias-label-secondary);list-style-position:inside}
.dsh-updates-details>summary:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px;border-radius:6px}
.dsh-updates-details .dsh-updates-list{margin-top:8px}
.dsh-updates-empty{display:flex;flex-direction:column;align-items:center;gap:8px;padding:48px 0;text-align:center}
.dsh-updates-empty-icon{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-state-success-primary)}
.dsh-updates-empty-title{margin:0;font-size:14px;line-height:20px;font-weight:500;color:var(--dsw-alias-label-primary)}
.dsh-updates-empty-hint{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.dsh-updates-skeleton{height:58px;border-radius:12px;background:var(--dsw-alias-bg-layer-2);animation:dsh-updates-pulse 1.6s ease-in-out infinite}
.dsh-updates-skeleton:nth-child(2){animation-delay:120ms}
.dsh-updates-skeleton:nth-child(3){animation-delay:240ms}
.dsh-updates-footer{display:flex;flex-wrap:wrap;gap:6px 12px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.dsh-updates-link{color:var(--dsw-alias-brand-primary);text-decoration:none}
.dsh-updates-link:hover{text-decoration:underline}
.dsh-updates-detail{display:flex;flex-direction:column;gap:10px;padding-top:8px}
.dsh-updates-kv{display:flex;flex-direction:column;gap:4px;margin:0}
.dsh-updates-kv>div{display:flex;align-items:baseline;justify-content:space-between;gap:16px;min-width:0}
.dsh-updates-kv dt{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);flex:none}
.dsh-updates-kv dd{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);text-align:right;overflow-wrap:anywhere}
.dsh-updates-code{display:block;margin:0;padding:8px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;line-height:17px;white-space:pre-wrap;overflow-wrap:anywhere}
.dsh-updates-detail-actions{display:flex;flex-wrap:wrap;gap:6px}
@keyframes dsh-updates-pulse{0%,100%{opacity:.55}50%{opacity:1}}
@media (prefers-reduced-motion: reduce){.dsh-updates-skeleton{animation:none}.dsh-updates-row,.dsh-updates-button{transition:none}}
@media (max-width:720px){.dsh-updates-row{align-items:flex-start;flex-wrap:wrap}.dsh-updates-tags{order:2}.dsh-updates-actions{order:3;width:100%;justify-content:flex-start}}
`;

    /** @param {unknown} error @returns {string} a printable message. */
    function messageOf(error) {
      if (error instanceof Error) return error.message;
      return String(error);
    }

    /** @returns {Record<string,string>} localStorage-backed ignored versions. */
    function loadIgnored() {
      try {
        const raw = globalThis.localStorage?.getItem(IGNORED_KEY);
        if (raw === null || raw === undefined) return {};
        const parsed = JSON.parse(raw);
        return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      } catch {
        return {};
      }
    }

    /** @param {Record<string,string>} value - ignored versions to persist. */
    function saveIgnored(value) {
      try {
        globalThis.localStorage?.setItem(IGNORED_KEY, JSON.stringify(value));
      } catch {
        /* localStorage can be unavailable; the page still works for this session. */
      }
    }

    /**
     * Format a timestamp for the current locale.
     * @param {number | null | undefined} value - epoch milliseconds.
     * @param {string | undefined} locale - active locale id.
     * @returns {string | null} the formatted time, or null.
     */
    function formatTime(value, locale) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return null;
      try {
        return new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
      } catch {
        return new Date(value).toLocaleString();
      }
    }

    /** @param {string} value @returns {Promise<void>} copy text through the clipboard API. */
    async function copyText(value) {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText !== undefined) {
        await navigator.clipboard.writeText(value);
        return;
      }
      throw new Error('clipboard unavailable');
    }

    /**
     * Subscribe a component to a store snapshot with the plain hooks the
     * dynamic Client runtime provides.
     * @param {UpdatesStore} store - update store.
     * @returns {object} the current snapshot.
     */
    function useStore(store) {
      const [, setRevision] = React.useState(0);
      React.useEffect(() => store.subscribe(() => setRevision((value) => value + 1)), [store]);
      return store.getSnapshot();
    }

    /** @param {UpdatesStore} store - update store. */
    function useLoad(store) {
      React.useEffect(() => { void store.load(); }, [store]);
    }

    /** @param {string} reason @param {(key: string) => string} t @returns {string} localized reason text. */
    function reasonText(reason, t) {
      switch (reason) {
        case 'local': return t('reasonLocal');
        case 'tarball': return t('reasonTarball');
        case 'git': return t('reasonGit');
        case 'private': return t('reasonPrivate');
        case 'not-found': return t('reasonNotFound');
        case 'network': return t('reasonNetwork');
        case 'no-version': return t('reasonNoVersion');
        case 'range': return t('reasonRange');
        default: return t('reasonInvalid');
      }
    }

    /** @param {string} label @param {string} [tone] @returns {object} a tag element. */
    function tag(label, tone) {
      const suffix = tone === 'update' ? ' dsh-updates-tag-update' : tone === 'official' ? ' dsh-updates-tag-official' : '';
      return h('span', { className: `dsh-updates-tag${suffix}` }, label);
    }

    /** One metadata report, kept in the Host and polled only while a check runs. */
    class UpdatesStore {
      /** @param {any} ctx - browser plugin context. */
      constructor(ctx) {
        this.ctx = ctx;
        this.snapshot = { phase: 'idle', report: null, error: null, ignored: loadIgnored() };
        this.listeners = new Set();
        this.timer = null;
        this.changeTimer = null;
        this.loading = null;
        this.disposed = false;
      }

      /** @returns {string | undefined} the active locale id. */
      get localeId() {
        try {
          return this.ctx.locale.getSnapshot().id;
        } catch {
          return undefined;
        }
      }

      /** @returns {object} the current snapshot. */
      getSnapshot() {
        return this.snapshot;
      }

      /** @param {() => void} listener - snapshot subscriber. @returns {() => void} unsubscribe. */
      subscribe(listener) {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
      }

      notify() {
        for (const listener of this.listeners) {
          try {
            listener();
          } catch {
            /* one broken subscriber must not stop the others. */
          }
        }
      }

      /** @param {object} next - partial snapshot. */
      patch(next) {
        this.snapshot = { ...this.snapshot, ...next };
        this.notify();
      }

      /** @param {{ name?: string, latest?: string | null } | null} item - report item. @returns {boolean} whether this exact version is ignored. */
      isIgnored(item) {
        if (item === null || typeof item !== 'object') return false;
        return this.snapshot.ignored[item.name] === item.latest;
      }

      /** @param {string} name @param {string} version - hide this exact target. */
      ignore(name, version) {
        this.snapshot.ignored = { ...this.snapshot.ignored, [name]: version };
        saveIgnored(this.snapshot.ignored);
        this.notify();
      }

      /** @param {string} name - show this package again. */
      restore(name) {
        const next = { ...this.snapshot.ignored };
        delete next[name];
        this.snapshot.ignored = next;
        saveIgnored(next);
        this.notify();
      }

      /** Refresh shortly after the Host reports a profile change. */
      invalidate() {
        if (this.disposed) return;
        if (this.changeTimer !== null) clearTimeout(this.changeTimer);
        this.changeTimer = setTimeout(() => {
          this.changeTimer = null;
          void this.load({ force: true });
        }, 800);
      }

      /** Poll once while the Host is still checking. */
      schedulePoll() {
        if (this.timer !== null || this.disposed) return;
        this.timer = setTimeout(() => {
          this.timer = null;
          void this.load();
        }, 1000);
      }

      /**
       * Read the Host report.
       * @param {{ force?: boolean, wait?: boolean }} [input] - force a sweep and/or wait for it.
       * @returns {Promise<void>} completion.
       */
      async load(input = {}) {
        if (this.disposed) return;
        if (this.loading !== null) return this.loading;
        const force = input.force === true;
        const wait = input.wait === true;
        this.patch({ phase: this.snapshot.report === null ? 'loading' : 'refreshing', error: null });
        this.loading = (async () => {
          try {
            const result = await this.ctx.connection.rpc.call('/api', RPC_CHANNEL, {
              endpoint: 'report',
              payload: { force, wait },
            });
            if (result?.ok !== true) throw new Error(result?.error?.message ?? 'RPC failed');
            if (this.disposed) return;
            this.patch({ phase: 'idle', report: result.value, error: null });
            if (result.value?.checking === true) this.schedulePoll();
          } catch (error) {
            if (this.disposed) return;
            this.patch({ phase: 'error', error: messageOf(error) });
          } finally {
            this.loading = null;
          }
        })();
        return this.loading;
      }

      dispose() {
        this.disposed = true;
        if (this.timer !== null) clearTimeout(this.timer);
        if (this.changeTimer !== null) clearTimeout(this.changeTimer);
        this.timer = null;
        this.changeTimer = null;
        this.listeners.clear();
      }
    }

    /** A section heading with an optional count. */
    function Section({ title, count, children }) {
      return h('section', { className: 'dsh-updates-section' },
        h('h3', { className: 'dsh-updates-section-title' }, title, count === undefined ? null : h('span', { className: 'dsh-updates-count' }, ` (${count})`)),
        children,
      );
    }

    /** One update, unknown, or current row. */
    function UpdateRow({ t, store, item, copied, onCopy, openPackage, onRestore }) {
      const update = item.status === 'update';
      const ignored = update && store.isIgnored(item);
      const command = typeof item.command === 'string' ? item.command : null;
      return h('li', { className: 'dsh-updates-row', 'data-status': item.status },
        h('div', { className: 'dsh-updates-row-main' },
          h('div', { className: 'dsh-updates-name' }, item.title === undefined || item.title === item.name ? item.name : item.title),
          item.title !== undefined && item.title !== item.name ? h('div', { className: 'dsh-updates-subname' }, item.name) : null,
          item.description === undefined ? null : h('div', { className: 'dsh-updates-desc' }, item.description),
          h('div', { className: 'dsh-updates-meta' },
            h('code', { className: 'dsh-updates-version' }, item.version ?? '?'),
            update ? h('span', { className: 'dsh-updates-arrow' }, '→') : null,
            update ? h('code', { className: 'dsh-updates-version dsh-updates-version-target' }, item.latest) : null,
            item.checkedFrom === null || item.checkedFrom === undefined ? null : h('span', null, t('via', { source: item.checkedFrom })),
            item.reason === null || item.reason === undefined ? null : h('span', null, reasonText(item.reason, t)),
            ignored ? h('span', null, t('sectionIgnored')) : null,
          ),
        ),
        h('div', { className: 'dsh-updates-tags' },
          item.sourceKind === 'git' ? tag(t('tagGit')) : item.sourceKind === 'registry' ? tag(t('tagNpm')) : null,
          update ? tag(t('tagUpdate'), 'update') : null,
        ),
        h('div', { className: 'dsh-updates-actions' },
          update && !ignored && command !== null
            ? h('button', {
              type: 'button',
              className: 'dsh-updates-button dsh-updates-button-accent',
              onClick: () => { void onCopy(command); },
            }, copied === command ? t('copied') : t('copyCommand'))
            : null,
          ignored
            ? h('button', { type: 'button', className: 'dsh-updates-button', onClick: () => { onRestore(item.name); } }, t('restore'))
            : null,
          typeof openPackage === 'function'
            ? h('button', { type: 'button', className: 'dsh-updates-button', onClick: () => { openPackage(item.name); } }, t('openDetails'))
            : null,
          update && !ignored
            ? h('button', { type: 'button', className: 'dsh-updates-button', onClick: () => { store.ignore(item.name, item.latest); } }, t('ignore'))
            : null,
        ),
      );
    }

    /** The official release line card or current line. */
    function OfficialLine({ t, official, ignored, onIgnore, onRestore }) {
      if (official === null || official === undefined) return null;
      const update = official.updateAvailable === true;
      const latest = official.latest;
      return h('section', { className: 'dsh-updates-section' },
        h('h3', { className: 'dsh-updates-section-title' }, t('official'), update
          ? h('span', { className: 'dsh-updates-count' }, ` (${official.bundleCount})`)
          : null),
        update
          ? h('div', { className: 'dsh-updates-row', 'data-status': 'update' },
            h('div', { className: 'dsh-updates-row-main' },
              h('div', { className: 'dsh-updates-name' }, `DSH ${official.runtime} → ${latest}`),
              h('div', { className: 'dsh-updates-meta' },
                h('span', null, t('officialHint')),
                official.checkedFrom === null ? null : h('span', null, t('via', { source: official.checkedFrom })),
              ),
            ),
            h('div', { className: 'dsh-updates-tags' }, tag(t('official'), 'official'), tag(t('tagUpdate'), 'update')),
            h('div', { className: 'dsh-updates-actions' },
              ignored
                ? h('button', { type: 'button', className: 'dsh-updates-button', onClick: onRestore }, t('restore'))
                : h('button', { type: 'button', className: 'dsh-updates-button', onClick: onIgnore }, t('ignore')),
              h('a', {
                className: 'dsh-updates-button',
                href: `https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v${latest}`,
                target: '_blank',
                rel: 'noreferrer noopener',
              }, t('officialLink')),
            ),
          )
          : h('p', { className: 'dsh-updates-muted' }, t('officialCurrent', { version: official.runtime })),
      );
    }

    /** The Updates tab on the Plugins page. */
    function UpdatesTab(props) {
      const { t, store, openPackage } = props;
      const state = useStore(store);
      useLoad(store);
      const [copied, setCopied] = React.useState(null);
      const report = state.report;
      const checking = state.phase === 'loading' || report?.checking === true;
      const items = Array.isArray(report?.items) ? report.items : [];
      const updates = items.filter((item) => item.status === 'update' && !store.isIgnored(item));
      const ignored = items.filter((item) => item.status === 'update' && store.isIgnored(item));
      const unknown = items.filter((item) => item.status === 'unknown');
      const current = items.filter((item) => item.status === 'current');
      const official = report?.official ?? null;
      const officialIgnored = official !== null && official !== undefined && store.isIgnored({ name: '@deepseek-ai/dsh', latest: official.latest });
      const officialUpdate = official?.updateAvailable === true && !officialIgnored;
      const updateCount = updates.length + (officialUpdate ? 1 : 0);
      const time = formatTime(report?.checkedAt, store.localeId);
      const summary = report === null || report === undefined
        ? t('neverChecked')
        : checking
          ? t('checking')
          : updateCount > 0
            ? t('updatesFound', { count: updateCount })
            : t('allCurrent');
      const counts = report?.counts;
      const detail = counts === undefined
        ? null
        : t('summary', { third: counts.thirdParty, official: counts.official });

      const checkNow = () => { void store.load({ force: true, wait: true }); };
      const copy = async (value) => {
        try {
          await copyText(value);
          setCopied(value);
        } catch {
          setCopied(null);
        }
      };

      const body = [];
      if (report?.error !== null && report?.error !== undefined) {
        body.push(h('div', { key: 'error', className: 'dsh-updates-banner dsh-updates-banner-error', role: 'alert' },
          h('div', { className: 'dsh-updates-banner-main' },
            h('strong', null, t('errorTitle')),
            h('span', null, report.error),
            report.stale === true ? h('span', null, t('errorStale')) : null,
          ),
          h('button', { type: 'button', className: 'dsh-updates-button', onClick: checkNow }, t('retry')),
        ));
      }
      if (state.error !== null && (report === null || report === undefined)) {
        body.push(h('div', { key: 'rpc-error', className: 'dsh-updates-banner dsh-updates-banner-error', role: 'alert' },
          h('div', { className: 'dsh-updates-banner-main' },
            h('strong', null, t('errorTitle')),
            h('span', null, state.error),
          ),
          h('button', { type: 'button', className: 'dsh-updates-button', onClick: checkNow }, t('retry')),
        ));
      }
      if (report?.enabled === false) {
        body.push(h('div', { key: 'disabled', className: 'dsh-updates-banner' }, t('disabled')));
      }
      if (Array.isArray(report?.unavailableSources) && report.unavailableSources.length > 0) {
        body.push(h('div', { key: 'sources', className: 'dsh-updates-banner dsh-updates-banner-warn' },
          t('unavailableSources', { sources: report.unavailableSources.join(', ') })));
      }
      if (report === null || report === undefined) {
        if (checking) {
          body.push(h('div', { key: 'skeleton', className: 'dsh-updates-section' },
            h('div', { className: 'dsh-updates-skeleton' }),
            h('div', { className: 'dsh-updates-skeleton' }),
            h('div', { className: 'dsh-updates-skeleton' }),
          ));
        }
        return h('div', { className: 'dsh-updates-root' },
          header(),
          ...body,
          h('div', { className: 'dsh-updates-empty' },
            h('span', { className: 'dsh-updates-empty-icon' }, '·'),
            h('p', { className: 'dsh-updates-empty-title' }, t('neverChecked')),
            h('p', { className: 'dsh-updates-empty-hint' }, t('emptyHint')),
          ),
        );
      }

      body.push(h(OfficialLine, {
        key: 'official',
        t,
        official,
        ignored: officialIgnored,
        onIgnore: () => { store.ignore('@deepseek-ai/dsh', official.latest); },
        onRestore: () => { store.restore('@deepseek-ai/dsh'); },
      }));

      if (updates.length > 0) {
        body.push(h(Section, { key: 'updates', title: t('sectionUpdates'), count: updates.length },
          h('ul', { className: 'dsh-updates-list' },
            updates.map((item) => h(UpdateRow, {
              key: item.name,
              t,
              store,
              item,
              copied,
              onCopy: copy,
              openPackage,
              onRestore: (name) => { store.restore(name); },
            })),
          ),
        ));
      }

      if (updateCount === 0 && unknown.length === 0) {
        body.push(h('div', { key: 'empty', className: 'dsh-updates-empty' },
          h('span', { className: 'dsh-updates-empty-icon' }, '✓'),
          h('p', { className: 'dsh-updates-empty-title' }, t('emptyTitle')),
          h('p', { className: 'dsh-updates-empty-hint' }, t('emptyHint')),
        ));
      }

      if (unknown.length > 0) {
        body.push(h('details', { key: 'unknown', className: 'dsh-updates-details' },
          h('summary', null, `${t('sectionUnknown')} (${unknown.length})`),
          h('ul', { className: 'dsh-updates-list' },
            unknown.map((item) => h(UpdateRow, {
              key: item.name,
              t,
              store,
              item,
              copied,
              onCopy: copy,
              openPackage,
              onRestore: (name) => { store.restore(name); },
            })),
          ),
        ));
      }

      if (current.length > 0) {
        body.push(h('details', { key: 'current', className: 'dsh-updates-details' },
          h('summary', null, `${t('sectionCurrent')} (${current.length})`),
          h('ul', { className: 'dsh-updates-list' },
            current.map((item) => h(UpdateRow, {
              key: item.name,
              t,
              store,
              item,
              copied,
              onCopy: copy,
              openPackage,
              onRestore: (name) => { store.restore(name); },
            })),
          ),
        ));
      }

      if (ignored.length > 0) {
        body.push(h('details', { key: 'ignored', className: 'dsh-updates-details' },
          h('summary', null, `${t('sectionIgnored')} (${ignored.length})`),
          h('ul', { className: 'dsh-updates-list' },
            ignored.map((item) => h(UpdateRow, {
              key: item.name,
              t,
              store,
              item,
              copied,
              onCopy: copy,
              openPackage,
              onRestore: (name) => { store.restore(name); },
            })),
          ),
        ));
      }

      const sources = Array.isArray(report.sources) && report.sources.length > 0
        ? t('sourcesUsed', { sources: report.sources.join(' · ') })
        : null;
      const footer = h('div', { className: 'dsh-updates-footer' },
        sources,
        detail,
        time === null ? t('neverChecked') : t('lastChecked', { time }),
        report.profile === null || report.profile === undefined ? null : h('span', null, `profile: ${report.profile}`),
      );

      function header() {
        return h('div', { className: 'dsh-updates-head' },
          h('div', { className: 'dsh-updates-head-text' },
            h('h2', { className: 'dsh-updates-title' }, t('title')),
            h('p', { className: 'dsh-updates-sub', role: 'status' }, summary),
          ),
          h('div', { className: 'dsh-updates-actions' },
            h('button', {
              type: 'button',
              className: 'dsh-updates-button dsh-updates-button-accent',
              onClick: checkNow,
              disabled: checking,
            }, checking ? t('checking') : t('checkNow')),
          ),
        );
      }

      return h('div', { className: 'dsh-updates-root' }, header(), ...body, footer);
    }

    /** A small tag beside a bundle's title. */
    function UpdateBadge(props) {
      const { t, store, subject } = props;
      const state = useStore(store);
      useLoad(store);
      if (subject?.kind !== 'bundle') return null;
      const report = state.report;
      if (report === null || report === undefined) return null;
      const item = Array.isArray(report.items) ? report.items.find((entry) => entry.name === subject.pkg.name) : undefined;
      if (item?.status === 'update' && !store.isIgnored(item)) {
        return h('span', { className: 'dsh-updates-badge', role: 'status' }, t('badgeUpdate', { version: item.latest }));
      }
      if (subject.pkg.official === true && report.official?.updateAvailable === true) {
        return h('span', { className: 'dsh-updates-badge', role: 'status' }, t('badgeOfficial', { version: report.official.latest }));
      }
      return null;
    }

    /** The detail page section for one bundle. */
    function UpdateSection(props) {
      const { t, store, subject } = props;
      const state = useStore(store);
      useLoad(store);
      const report = state.report;
      if (report === null || report === undefined || subject?.kind !== 'bundle') return null;
      const item = Array.isArray(report.items) ? report.items.find((entry) => entry.name === subject.pkg.name) : undefined;
      if (item === undefined) {
        if (subject.pkg.official !== true || report.official === null || report.official === undefined) return null;
        return h('section', { className: 'dsh-updates-detail' },
          h('h3', { className: 'dsh-updates-section-title' }, t('title')),
          h('p', { className: 'dsh-updates-muted' }, report.official.updateAvailable === true
            ? t('officialHint')
            : t('detailNoUpdate')),
        );
      }
      const update = item.status === 'update';
      const time = formatTime(report.checkedAt, store.localeId);
      return h('section', { className: 'dsh-updates-detail' },
        h('h3', { className: 'dsh-updates-section-title' }, t('title')),
        h('dl', { className: 'dsh-updates-kv' },
          h('div', null, h('dt', null, t('detailCurrent')), h('dd', null, item.version ?? '?')),
          h('div', null, h('dt', null, t('detailLatest')), h('dd', null, item.latest ?? '—')),
          h('div', null, h('dt', null, t('detailStatus')), h('dd', null, update ? t('update') : item.status === 'current' ? t('current') : t('unknown'))),
          item.source === null ? null : h('div', null, h('dt', null, t('detailSource')), h('dd', null, item.source)),
          item.checkedFrom === null ? null : h('div', null, h('dt', null, t('detailCheckedFrom')), h('dd', null, item.checkedFrom)),
          time === null ? null : h('div', null, h('dt', null, t('detailCheckedAt')), h('dd', null, time)),
        ),
        item.reason === null || item.reason === undefined ? null : h('p', { className: 'dsh-updates-muted' }, reasonText(item.reason, t)),
        update && typeof item.command === 'string'
          ? h('div', { className: 'dsh-updates-detail-actions' },
            h('button', {
              type: 'button',
              className: 'dsh-updates-button dsh-updates-button-accent',
              onClick: () => { void copyText(item.command).catch(() => {}); },
            }, t('copyCommand')),
          )
          : null,
        update && typeof item.command === 'string' ? h('pre', { className: 'dsh-updates-code' }, item.command) : null,
        h('p', { className: 'dsh-updates-muted' }, update ? t('detailHint') : item.status === 'unknown' ? t('detailUnknown') : t('detailNoUpdate')),
      );
    }

    /** @param {any} ctx - browser plugin context. */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { en, zh }), `${NS}: dictionaries`);
      const t = ctx.locale.bind(NS);
      const store = new UpdatesStore(ctx);
      ctx.effect(() => () => { store.dispose(); }, `${NS}: store`);
      ctx.effect(() => {
        const style = document.createElement('style');
        style.dataset.plugin = NS;
        style.textContent = CSS;
        document.head.append(style);
        return () => { style.remove(); };
      }, `${NS}: styles`);
      ctx.effect(() => {
        if (typeof ctx.remote?.$on !== 'function') return undefined;
        return ctx.remote.$on('plugin-manager/changed', () => { store.invalidate(); });
      }, `${NS}: host changes`);

      ctx.slots.inject('plugins.tab', () => ctx.slots.register({
        name: 'plugins.tab',
        id: 'updates',
        order: -10,
        label: () => t('title'),
        locale: NS,
        inject: () => ({ store }),
      }, UpdatesTab));
      ctx.slots.inject('plugins.detail.badge', () => ctx.slots.register({
        name: 'plugins.detail.badge',
        id: 'plugin-updates.badge',
        order: 0,
        locale: NS,
        inject: () => ({ store }),
      }, UpdateBadge));
      ctx.slots.inject('plugins.detail.section', () => ctx.slots.register({
        name: 'plugins.detail.section',
        id: 'plugin-updates.section',
        order: 0,
        locale: NS,
        inject: () => ({ store }),
      }, UpdateSection));
    }

    exports.inject = inject;
    exports.apply = apply;
    exports.NS = NS;
    return module.exports;
  },
});
