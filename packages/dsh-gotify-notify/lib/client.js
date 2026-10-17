window.__ModuleLoader__.load({
  id: '@wha7ever/dsh-gotify-notify',
  factory(require) {
    const module = { exports: {} };
    const exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

    const React = require('react');
    const h = React.createElement;

    /** Dictionary namespace owned by this plugin. */
    const NS = 'wha7ev9r.gotifyNotify';
    /** Host profile entry id; also the settings namespace this page edits. */
    const ENTRY_ID = 'gotify-notify';
    /** Exact authenticated route the Host half registered. */
    const RPC_CHANNEL = 'gotify-notify';

    const en = {
      label: 'Gotify alerts',
      heading: 'Gotify alerts',
      intro: 'Push a Gotify notification when the harness needs you: a question, an approval, a finished turn, or a failure. Every field below is saved into this profile and takes effect immediately.',
      enabled: 'Enable notifications',
      enabledHint: 'Turn every push off without losing the configuration.',
      connection: 'Server',
      serverUrl: 'Server URL',
      serverUrlHint: 'The base address of your Gotify instance, without /message. A path prefix is kept, for example https://push.example.com/gotify',
      credentialLabel: 'Application token',
      credentialHint: 'Create an application in the Gotify web UI (the apps tab) and copy its value. It is stored as a secret and never read back into this page.',
      configuredBadge: 'A credential is configured',
      unconfiguredBadge: 'No credential is configured',
      clearCredential: 'Remove credential',
      testHint: 'The test uses the saved configuration.',
      testDirty: 'Save your edits first, then send a test.',
      behaviour: 'Delivery',
      priority: 'Priority',
      priorityHint: 'Gotify maps the priority to how intrusive the notification is. 0 is silent, 1-3 shows a bar icon, 4-7 adds a sound, 8-10 adds vibration.',
      titlePrefix: 'Title prefix',
      titlePrefixHint: 'Prepended to every notification title so you can tell harness alerts apart.',
      mentionSession: 'Append the session id',
      mentionSessionHint: 'Useful when several sessions run at once.',
      events: 'Notify me when',
      onQuestion: 'The harness asks me a question',
      onQuestionHint: 'Sent the moment a question is composed, before you answer it.',
      onTurnEnd: 'A turn finishes',
      onTurnEndHint: 'Sent once the turn has really stopped, including a goal that ran out of rounds.',
      onApproval: 'A tool call needs my approval',
      onApprovalHint: 'Sent while the tool pipeline is blocked waiting for a decision.',
      onError: 'A turn fails',
      onErrorHint: 'Off by default; failures are already visible in the conversation.',
      test: 'Send a test notification',
      testing: 'Sending…',
      testOk: 'The server accepted the test message.',
      testFailed: 'The test message was not delivered:',
      save: 'Save',
      saving: 'Saving…',
      saved: 'Saved.',
      saveFailed: 'This deployment did not accept the values; they were left for you to correct.',
      loading: 'Loading this profile\'s configuration…',
      unavailable: 'This profile does not serve a configurable "gotify-notify" row, so the form has nothing to write to.',
      unavailableSchema: 'The harness Schemastery library could not be resolved, so this plugin declared no configuration schema.',
      unavailableRow: 'The row is missing from the active profile composition, or another entry owns the same id.',
      readOnly: 'This deployment stores settings read-only.',
      resetField: 'Reset',
      invalidNumber: 'Enter a whole number between 0 and 10.',
      configured: 'Configured',
      notConfigured: 'Not configured',
      lastError: 'Last delivery error:',
      sentCount: 'Messages delivered this session:',
    };

    const zh = {
      label: 'Gotify 提醒',
      heading: 'Gotify 提醒',
      intro: '当 DeepSeek Harness 需要你时，通过 Gotify 推送一条通知：提问、审批请求、任务结束或执行出错。以下配置会写入当前 profile，保存后立即生效。',
      enabled: '启用提醒',
      enabledHint: '关闭后不再推送，但保留所有配置。',
      connection: '服务器',
      serverUrl: '服务器地址',
      serverUrlHint: 'Gotify 实例的基础地址，不要带 /message；保留路径前缀，例如 https://push.example.com/gotify',
      credentialLabel: '应用令牌',
      credentialHint: '在 Gotify 网页版右上角的 apps 标签里新建应用并复制令牌。它以密钥形式保存，不会被读回本页面。',
      configuredBadge: '已配置令牌',
      unconfiguredBadge: '尚未配置令牌',
      clearCredential: '清除令牌',
      testHint: '测试使用已保存的配置。',
      testDirty: '请先保存，再发送测试。',
      behaviour: '投递',
      priority: '优先级',
      priorityHint: 'Gotify 用优先级决定提醒的打扰程度：0 静默，1-3 状态栏图标，4-7 加提示音，8-10 再加振动。',
      titlePrefix: '标题前缀',
      titlePrefixHint: '加在每条通知标题前面，便于和其他通知区分。',
      mentionSession: '附带会话 ID',
      mentionSessionHint: '同时有多个会话在跑时很有用。',
      events: '在以下情况提醒我',
      onQuestion: 'Harness 向我提问',
      onQuestionHint: '问题生成的瞬间就推送，不用等你切回来才发现。',
      onTurnEnd: '一轮任务结束',
      onTurnEndHint: '确认这一轮真的停下来后才推送，包含目标轮次用尽的情况。',
      onApproval: '有工具调用需要我批准',
      onApprovalHint: '工具流程被阻塞等待决定时推送。',
      onError: '一轮执行出错',
      onErrorHint: '默认关闭；对话里本来就能看到报错。',
      test: '发送测试通知',
      testing: '发送中…',
      testOk: '服务器已接受测试消息。',
      testFailed: '测试消息未送达：',
      save: '保存',
      saving: '保存中…',
      saved: '已保存。',
      saveFailed: '本部署没有接受这些值，已保留供你修改。',
      loading: '正在读取当前 profile 的配置…',
      unavailable: '当前 profile 没有提供可配置的 gotify-notify 行，表单没有可写入的目标。',
      unavailableSchema: '无法解析 Harness 自带的 Schemastery 库，本插件因此没有声明配置 schema。',
      unavailableRow: '该行不在当前 profile 组合中，或者同一 id 被其他条目占用。',
      readOnly: '本部署的设置为只读。',
      resetField: '恢复默认',
      invalidNumber: '请填 0 到 10 之间的整数。',
      configured: '已配置',
      notConfigured: '未配置',
      lastError: '上次投递错误：',
      sentCount: '本次运行已投递条数：',
    };

    /** Text fields staged as strings. */
    const TEXT_KEYS = ['serverUrl', 'titlePrefix'];
    /** Numeric fields staged as strings until save. */
    const NUMBER_KEYS = ['priority'];
    /** Boolean fields staged as booleans. */
    const BOOLEAN_KEYS = ['enabled', 'onQuestion', 'onTurnEnd', 'onApproval', 'onError', 'mentionSession'];
    /** The one write-only control; an empty draft keeps the stored value. */
    const SECRET_KEY = 'appToken';
    /** Shortest and longest priority Gotify documents. */
    const PRIORITY_MIN = 0;
    const PRIORITY_MAX = 10;

    const styles = {
      page: { display: 'flex', flexDirection: 'column', gap: '18px', padding: '16px 0', maxWidth: '720px' },
      heading: { color: 'var(--dsw-alias-label-primary)', fontSize: '16px', fontWeight: 600 },
      intro: { color: 'var(--dsw-alias-label-secondary)', fontSize: '12px', lineHeight: 1.7 },
      card: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '16px',
        border: '1px solid var(--dsw-alias-border-l2)',
        borderRadius: '12px',
        background: 'var(--dsw-alias-bg-layer-2)',
      },
      cardTitle: { color: 'var(--dsw-alias-label-secondary)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' },
      field: { display: 'flex', flexDirection: 'column', gap: '6px' },
      row: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' },
      rowText: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '0' },
      label: { color: 'var(--dsw-alias-label-primary)', fontSize: '13px' },
      hint: { color: 'var(--dsw-alias-label-secondary)', fontSize: '11px', lineHeight: 1.6 },
      input: {
        width: '100%',
        boxSizing: 'border-box',
        padding: '7px 10px',
        borderRadius: '8px',
        border: '1px solid var(--dsw-alias-border-l2)',
        background: 'var(--dsw-alias-bg-layer-1)',
        color: 'var(--dsw-alias-label-primary)',
        fontSize: '13px',
        fontFamily: 'inherit',
      },
      select: {
        padding: '7px 10px',
        borderRadius: '8px',
        border: '1px solid var(--dsw-alias-border-l2)',
        background: 'var(--dsw-alias-bg-layer-1)',
        color: 'var(--dsw-alias-label-primary)',
        fontSize: '13px',
        fontFamily: 'inherit',
      },
      checkbox: { width: '16px', height: '16px', marginTop: '2px', accentColor: 'var(--dsw-alias-brand-primary)', cursor: 'pointer', flexShrink: 0 },
      button: {
        border: '1px solid var(--dsw-alias-border-l2)',
        borderRadius: '8px',
        padding: '6px 14px',
        cursor: 'pointer',
        background: 'transparent',
        color: 'var(--dsw-alias-label-primary)',
        fontSize: '13px',
        fontFamily: 'inherit',
      },
      primary: {
        border: '1px solid var(--dsw-alias-brand-primary)',
        borderRadius: '8px',
        padding: '6px 14px',
        cursor: 'pointer',
        background: 'var(--dsw-alias-brand-primary)',
        color: '#ffffff',
        fontSize: '13px',
        fontFamily: 'inherit',
      },
      footer: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
      badge: {
        alignSelf: 'flex-start',
        fontSize: '11px',
        padding: '2px 8px',
        borderRadius: '999px',
        border: '1px solid var(--dsw-alias-border-l2)',
        color: 'var(--dsw-alias-label-secondary)',
      },
      notice: {
        fontSize: '12px',
        lineHeight: 1.7,
        color: 'var(--dsw-alias-label-secondary)',
        padding: '10px 12px',
        borderRadius: '8px',
        border: '1px solid var(--dsw-alias-border-l2)',
        background: 'var(--dsw-alias-bg-layer-2)',
      },
      error: { color: 'var(--dsw-alias-state-error-primary)' },
      success: { color: 'var(--dsw-alias-state-success-primary)' },
      meta: { color: 'var(--dsw-alias-label-secondary)', fontSize: '11px', lineHeight: 1.6 },
      diagnostics: {
        marginTop: '6px',
        fontFamily: 'var(--dsw-font-family-mono, monospace)',
        fontSize: '11px',
        wordBreak: 'break-all',
        opacity: 0.85,
      },
    };

    /**
     * Seed a stageable draft from one namespace value.
     * @param value - the settings namespace value, or anything else.
     * @returns the draft, with every field typed as the control expects.
     */
    function seedDraft(value) {
      const source = value !== null && typeof value === 'object' ? value : {};
      return {
        serverUrl: typeof source.serverUrl === 'string' ? source.serverUrl : '',
        titlePrefix: typeof source.titlePrefix === 'string' ? source.titlePrefix : 'DeepSeek Harness',
        priority: typeof source.priority === 'number' ? String(source.priority) : '8',
        credential: '',
        enabled: source.enabled !== false,
        onQuestion: source.onQuestion !== false,
        onTurnEnd: source.onTurnEnd !== false,
        onApproval: source.onApproval !== false,
        onError: source.onError === true,
        mentionSession: source.mentionSession !== false,
      };
    }

    /**
     * Build the ordered path operations one save would submit.
     * @param draft - the staged draft.
     * @returns the operations, in a stable order.
     */
    function operationsOf(draft) {
      const ops = [];
      for (const key of NUMBER_KEYS) {
        const raw = String(draft[key] ?? '').trim();
        if (raw === '') ops.push({ op: 'unset', path: [key] });
        else ops.push({ op: 'set', path: [key], value: Number(raw) });
      }
      for (const key of BOOLEAN_KEYS) ops.push({ op: 'set', path: [key], value: draft[key] === true });
      for (const key of TEXT_KEYS) {
        const raw = String(draft[key] ?? '').trim();
        if (raw === '') ops.push({ op: 'unset', path: [key] });
        else ops.push({ op: 'set', path: [key], value: raw });
      }
      if (String(draft.credential ?? '') !== '') ops.push({ op: 'set', path: [SECRET_KEY], value: draft.credential });
      return ops;
    }

    /**
     * Whether the draft holds what the Host already serves.
     * @param baseline - the draft seeded from the current namespace value.
     * @param draft - the user's staged draft.
     * @returns whether saving would write anything.
     */
    function isDirty(baseline, draft) {
      for (const key of [...NUMBER_KEYS, ...TEXT_KEYS]) if (baseline[key] !== draft[key]) return true;
      for (const key of BOOLEAN_KEYS) if (baseline[key] !== draft[key]) return true;
      return String(draft.credential ?? '') !== '';
    }

    /**
     * Whether a staged numeric draft is unusable.
     * @param draft - the staged draft.
     * @returns whether a value is present and not a whole number in range.
     */
    function hasInvalidNumber(draft) {
      for (const key of NUMBER_KEYS) {
        const raw = String(draft[key] ?? '').trim();
        if (raw === '') continue;
        const parsed = Number(raw);
        if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < PRIORITY_MIN || parsed > PRIORITY_MAX) return true;
      }
      return false;
    }

    /** Required services (Cordis fiber inject). */
    const inject = ['connection', 'slots', 'locale', 'configForms'];

    /**
     * Mount the Gotify settings page.
     * @param ctx - the browser plugin context.
     */
    function apply(ctx) {
      const t = ctx.locale.bind(NS);
      ctx.effect(() => ctx.locale.register(NS, { en, zh }), '@wha7ever/dsh-gotify-notify: dictionaries');

      const rpc = async (endpoint, payload) => {
        const result = await ctx.connection.rpc.call('/api', RPC_CHANNEL, {
          endpoint,
          payload: payload === undefined ? {} : payload,
        });
        if (!result.ok) throw new Error(result.error?.message || 'RPC failed');
        return result.value;
      };

      const scope = ctx.configForms.get(ENTRY_ID);
      const mirror = ctx.configForms.describe();

      function useLocaleRevision() {
        const [revision, setRevision] = React.useState(0);
        React.useEffect(() => ctx.locale.subscribe(() => {
          setRevision(ctx.locale.getSnapshot().revision);
        }), []);
        return revision;
      }

      /** @param source - the store or form to read. @returns its snapshot, re-rendering on change. */
      function useSnapshot(source) {
        const [snapshot, setSnapshot] = React.useState(() => source.getSnapshot());
        React.useEffect(() => {
          setSnapshot(source.getSnapshot());
          return source.subscribe(() => setSnapshot(source.getSnapshot()));
        }, [source]);
        return snapshot;
      }

      /**
       * One label-plus-control row. The label is associated with the control by
       * id, so the switch is reachable by name from the accessibility tree.
       * @param props - the row's id, label text, hint text, and control element.
       * @returns one labelled row.
       */
      function FieldRow(props) {
        return h('div', { style: styles.row },
          h('div', { style: styles.rowText },
            h('label', { style: styles.label, htmlFor: props.id }, props.label),
            props.hint === undefined ? null : h('span', { style: styles.hint }, props.hint),
          ),
          props.control,
        );
      }

      function Panel() {
        useLocaleRevision();
        const snapshot = useSnapshot(scope);
        const mirrored = useSnapshot(mirror);
        const [draft, setDraft] = React.useState(null);
        const [saving, setSaving] = React.useState(false);
        const [failed, setFailed] = React.useState(false);
        const [savedAt, setSavedAt] = React.useState(0);
        const [probe, setProbe] = React.useState(null);
        const [test, setTest] = React.useState(null);
        const [testing, setTesting] = React.useState(false);

        const value = snapshot.value;
        const ready = snapshot.status === 'ready' && value !== null && typeof value === 'object';
        const baseline = React.useMemo(() => seedDraft(ready ? value : {}), [ready, value]);

        React.useEffect(() => {
          if (!ready) return;
          setDraft((previous) => previous === null ? baseline : previous);
        }, [ready, baseline]);

        const refreshProbe = React.useCallback(() => {
          rpc('status').then(setProbe).catch((cause) => setProbe({ error: cause?.message || String(cause) }));
        }, []);

        React.useEffect(() => {
          refreshProbe();
        }, [refreshProbe]);

        if (snapshot.status === 'loading') {
          return h('div', { style: styles.page }, h('div', { style: styles.meta }, t('loading')));
        }

        const namespace = mirrored.view?.namespaces?.find((candidate) => candidate.ns === ENTRY_ID);
        const tokenSet = (namespace?.secrets ?? []).some((secret) => secret.path.length === 1 && secret.path[0] === SECRET_KEY && secret.set === true);
        const configurable = probe?.configurable !== false;
        const dirty = draft !== null && isDirty(baseline, draft);
        const invalid = draft !== null && hasInvalidNumber(draft);
        const writable = snapshot.writable === true;

        const edit = (key, next) => setDraft((previous) => previous === null ? previous : { ...previous, [key]: next });

        /**
         * One boolean switch row, staged in the draft like every other field.
         * @param key - the Config field and the row's id suffix.
         * @returns the labelled switch row.
         */
        const switchRow = (key) => FieldRow({
          id: `gotify-${key}`,
          label: t(key),
          hint: t(`${key}Hint`),
          control: h('input', {
            id: `gotify-${key}`,
            type: 'checkbox',
            role: 'switch',
            style: styles.checkbox,
            disabled: !writable,
            checked: draft[key] === true,
            onChange: (event) => edit(key, event.target.checked),
          }),
        });

        const save = async () => {
          if (draft === null || saving) return;
          setSaving(true);
          setFailed(false);
          try {
            const accepted = await scope.mutate(operationsOf(draft), snapshot.revision);
            if (accepted) {
              setDraft(seedDraft(scope.getSnapshot().value));
              setSavedAt(Date.now());
              refreshProbe();
            }
            setFailed(!accepted);
          } catch {
            setFailed(true);
          } finally {
            setSaving(false);
          }
        };

        const clearToken = async () => {
          if (saving) return;
          setSaving(true);
          setFailed(false);
          try {
            const accepted = await scope.unset(SECRET_KEY);
            if (accepted) {
              setDraft(seedDraft(scope.getSnapshot().value));
              refreshProbe();
            }
            setFailed(!accepted);
          } catch {
            setFailed(true);
          } finally {
            setSaving(false);
          }
        };

        const sendTest = async () => {
          if (testing) return;
          setTesting(true);
          setTest(null);
          try {
            setTest({ ok: true, value: await rpc('test') });
          } catch (cause) {
            setTest({ ok: false, message: cause?.message || String(cause) });
          } finally {
            setTesting(false);
            refreshProbe();
          }
        };

        const children = [];

        // The form has nothing to write to whenever the Host does not serve this
        // namespace (`status`), the row is absent from the composition, or the
        // plugin declared no schema at all. Each cause is reported separately, so
        // an empty page never leaves the reader guessing.
        if (!ready || !configurable || probe?.schemaAvailable === false) {
          children.push(h('div', { key: 'unavailable', style: styles.notice, role: 'status' },
            h('div', null, t('unavailable')),
            probe?.schemaAvailable === false ? h('div', null, t('unavailableSchema')) : null,
            // The module URL and the per-anchor failures make one screenshot
            // enough to place an unresolved schema, without a Host log.
            probe?.schemaAvailable === false && probe?.schemaDiagnostics !== undefined
              ? h('div', { style: styles.diagnostics },
                `${probe.schemaDiagnostics.moduleUrl ?? '(no url)'} · ` +
                (probe.schemaDiagnostics.attempts ?? []).map((attempt) => `${attempt.anchor}:${attempt.ok ? 'ok' : attempt.error}`).join(' | '))
              : null,
            configurable ? null : h('div', null, t('unavailableRow')),
          ));
        }

        if (ready && !writable) {
          children.push(h('div', { key: 'readonly', style: styles.notice, role: 'status' }, t('readOnly')));
        }

        if (draft !== null) {
          children.push(h('div', { key: 'server', style: styles.card },
            h('div', { style: styles.cardTitle }, t('connection')),
            h('div', { style: styles.field },
              h('label', { style: styles.label, htmlFor: 'gotify-server-url' }, t('serverUrl')),
              h('input', {
                id: 'gotify-server-url',
                style: styles.input,
                type: 'text',
                spellCheck: false,
                autoComplete: 'off',
                placeholder: 'https://push.example.com',
                disabled: !writable,
                value: draft.serverUrl,
                onChange: (event) => edit('serverUrl', event.target.value),
              }),
              h('p', { style: styles.hint }, t('serverUrlHint')),
            ),
            h('div', { style: styles.field },
              h('div', { style: styles.row },
                h('label', { style: styles.label, htmlFor: 'gotify-app-token' }, t('credentialLabel')),
                h('span', { style: styles.badge }, tokenSet ? t('configuredBadge') : t('unconfiguredBadge')),
              ),
              h('input', {
                id: 'gotify-app-token',
                style: styles.input,
                type: 'password',
                autoComplete: 'new-password',
                spellCheck: false,
                disabled: !writable,
                value: draft.credential,
                onChange: (event) => edit('credential', event.target.value),
              }),
              h('p', { style: styles.hint }, t('credentialHint')),
              h('button', {
                type: 'button',
                style: styles.button,
                disabled: !writable || saving || !tokenSet,
                onClick: clearToken,
              }, t('clearCredential')),
            ),
          ));

          const priorityOptions = [];
          for (let level = PRIORITY_MIN; level <= PRIORITY_MAX; level += 1) {
            priorityOptions.push(h('option', { key: level, value: String(level) }, String(level)));
          }

          children.push(h('div', { key: 'delivery', style: styles.card },
            h('div', { style: styles.cardTitle }, t('behaviour')),
            h('div', { style: styles.field },
              h('label', { style: styles.label, htmlFor: 'gotify-priority' }, t('priority')),
              h('select', {
                id: 'gotify-priority',
                style: styles.select,
                disabled: !writable,
                value: draft.priority,
                onChange: (event) => edit('priority', event.target.value),
              }, priorityOptions),
              h('p', { style: invalid ? styles.error : styles.hint }, invalid ? t('invalidNumber') : t('priorityHint')),
            ),
            h('div', { style: styles.field },
              h('label', { style: styles.label, htmlFor: 'gotify-title-prefix' }, t('titlePrefix')),
              h('input', {
                id: 'gotify-title-prefix',
                style: styles.input,
                type: 'text',
                spellCheck: false,
                disabled: !writable,
                value: draft.titlePrefix,
                onChange: (event) => edit('titlePrefix', event.target.value),
              }),
              h('p', { style: styles.hint }, t('titlePrefixHint')),
            ),
            switchRow('mentionSession'),
          ));

          children.push(h('div', { key: 'events', style: styles.card },
            h('div', { style: styles.cardTitle }, t('events')),
            switchRow('enabled'),
            switchRow('onQuestion'),
            switchRow('onTurnEnd'),
            switchRow('onApproval'),
            switchRow('onError'),
          ));
        }

        const testOutcome = test === null ? null : test.ok
          ? h('p', { style: styles.success }, `${t('testOk')} ${test.value?.detail ?? ''}`.trim())
          : h('p', { style: styles.error }, `${t('testFailed')} ${test.message}`);

        children.push(h('div', { key: 'footer', style: styles.footer },
          h('button', {
            type: 'button',
            style: styles.button,
            disabled: testing || saving,
            onClick: sendTest,
          }, testing ? t('testing') : t('test')),
          h('button', {
            type: 'button',
            style: styles.primary,
            disabled: draft === null || !dirty || invalid || saving || !writable,
            onClick: save,
          }, saving ? t('saving') : t('save')),
          h('span', { style: styles.hint }, dirty ? t('testDirty') : t('testHint')),
          savedAt !== 0 && !dirty ? h('span', { style: styles.success }, t('saved')) : null,
          failed ? h('span', { style: styles.error }, t('saveFailed')) : null,
        ));

        if (testOutcome !== null) children.push(h('div', { key: 'test', style: styles.meta }, testOutcome));
        if (probe !== null && probe !== undefined) {
          children.push(h('div', { key: 'probe', style: styles.meta },
            h('div', null, `${t('serverUrl')}：${probe.serverUrl === '' || probe.serverUrl === undefined ? '—' : probe.serverUrl}`),
            h('div', null, probe.tokenSet ? t('configuredBadge') : t('unconfiguredBadge')),
            probe.lastError === null || probe.lastError === undefined ? null : h('div', { style: styles.error }, `${t('lastError')} ${probe.lastError}`),
            h('div', null, `${t('sentCount')} ${probe.sent ?? 0}`),
          ));
        }

        return h('div', { style: styles.page },
          h('div', { style: styles.heading }, t('heading')),
          h('div', { style: styles.intro }, t('intro')),
          children,
        );
      }

      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'gotify-notify',
        order: 40,
        label: () => t('label'),
        locale: NS,
      }, Panel));
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
