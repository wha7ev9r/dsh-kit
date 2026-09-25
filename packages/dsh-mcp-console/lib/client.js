window.__ModuleLoader__.load({
  id: '@wha7ev9r/dsh-mcp-console',
  factory(require) {
    const module = { exports: {} };
    const exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
    const React = require('react');
    const h = React.createElement;

    const NS = 'wha7ev9r.mcpConsole';
    const en = {
      label: 'MCP servers',
      heading: 'MCP servers',
      error: 'Error:',
      empty: 'No MCP server rows are present in this composition.',
      running: 'Running',
      disabled: 'Disabled',
      failed: 'Failed',
      starting: 'Starting',
      unknown: 'Unknown',
      enable: 'Enable',
      disable: 'Disable',
      hint: 'Changes take effect immediately and are persisted by DSH. The model can also use mcp_status and mcp_toggle.',
      unknownTransport: 'unknown transport',
    };
    const zh = {
      label: 'MCP 服务器',
      heading: 'MCP 服务器',
      error: '错误：',
      empty: '当前组合中没有 MCP 服务器行。',
      running: '运行中',
      disabled: '已停用',
      failed: '失败',
      starting: '启动中',
      unknown: '未知',
      enable: '启用',
      disable: '停用',
      hint: '启停实时生效并由 DSH 持久化；模型也可以使用 mcp_status / mcp_toggle 工具。',
      unknownTransport: '未知传输方式',
    };
    const inject = ['connection', 'slots', 'timer', 'locale'];

    function apply(ctx) {
      const t = ctx.locale.bind(NS);
      ctx.effect(() => ctx.locale.register(NS, { en, zh }), '@wha7ev9r/dsh-mcp-console: dictionaries');

      const rpc = async (endpoint, payload) => {
        const result = await ctx.connection.rpc.call('/api', 'mcp-console', {
          endpoint,
          payload: payload === undefined ? {} : payload,
        });
        if (!result.ok) {
          throw new Error(result.error?.message || 'RPC failed');
        }
        return result.value;
      };

      const stateLabel = (server) => {
        if (server.disabled) return t('disabled');
        if (server.state === 'active') return t('running');
        if (server.state === 'failed') return t('failed');
        if (server.state === 'pending' || server.state === 'loading') return t('starting');
        return t('unknown');
      };

      const stateColor = (server) => {
        if (server.disabled) return 'var(--dsw-alias-label-secondary)';
        if (server.state === 'active') return 'var(--dsw-alias-state-success-primary)';
        if (server.state === 'failed') return 'var(--dsw-alias-state-error-primary)';
        return 'var(--dsw-alias-state-warn-primary)';
      };

      const sectionStyle = {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '16px 0',
      };
      const rowStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '10px 14px',
        border: '1px solid var(--dsw-alias-border-l2)',
        borderRadius: '12px',
        background: 'var(--dsw-alias-bg-layer-2)',
      };
      const nameStyle = { color: 'var(--dsw-alias-label-primary)', fontSize: '14px' };
      const metaStyle = { color: 'var(--dsw-alias-label-secondary)', fontSize: '12px' };
      const buttonStyle = {
        border: '1px solid var(--dsw-alias-border-l2)',
        borderRadius: '8px',
        padding: '4px 12px',
        cursor: 'pointer',
        background: 'transparent',
        color: 'var(--dsw-alias-label-primary)',
      };

      function useLocaleRevision() {
        const [revision, setRevision] = React.useState(0);
        React.useEffect(() => ctx.locale.subscribe(() => {
          setRevision(ctx.locale.getSnapshot().revision);
        }), []);
        return revision;
      }

      function Panel() {
        useLocaleRevision();
        const [data, setData] = React.useState(null);
        const [error, setError] = React.useState(null);
        const [busy, setBusy] = React.useState(null);

        React.useEffect(() => {
          let alive = true;
          const refresh = async () => {
            try {
              const result = await rpc('list');
              if (alive) {
                setData(result);
                setError(null);
              }
            } catch (cause) {
              if (alive) setError(cause?.message || String(cause));
            }
          };
          refresh();
          const dispose = ctx.interval(refresh, 2000);
          return () => {
            alive = false;
            dispose();
          };
        }, []);

        const toggle = async (server) => {
          setBusy(server.id);
          try {
            const result = await rpc('toggle', { id: server.id, disabled: !server.disabled });
            setData(result);
            setError(null);
          } catch (cause) {
            setError(cause?.message || String(cause));
          } finally {
            setBusy(null);
          }
        };

        const servers = data?.servers || [];
        return h('div', { style: sectionStyle },
          h('div', { style: { color: 'var(--dsw-alias-label-primary)', fontSize: '16px' } }, t('heading')),
          error ? h('div', { role: 'alert', style: { color: 'var(--dsw-alias-state-error-primary)', fontSize: '12px' } }, `${t('error')}${error}`) : null,
          servers.length === 0 ? h('div', { style: metaStyle }, t('empty')) : null,
          servers.map((server) => h('div', { key: server.id, style: rowStyle },
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '0' } },
              h('span', { style: nameStyle }, server.serverName || server.id),
              h('span', { style: { ...metaStyle, overflowWrap: 'anywhere' } },
                `${server.transport || t('unknownTransport')}${server.url ? ` · ${server.url}` : ''}`)
            ),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', flexShrink: '0' } },
              h('span', { style: { color: stateColor(server), fontSize: '12px' } }, stateLabel(server)),
              h('button', {
                type: 'button',
                onClick: () => toggle(server),
                disabled: busy === server.id,
                style: buttonStyle,
              }, server.disabled ? t('enable') : t('disable'))
            )
          )),
          h('div', { style: metaStyle }, t('hint'))
        );
      }

      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'mcp-servers',
        order: 25,
        label: () => t('label'),
        locale: NS,
      }, Panel));
    }

    exports.inject = inject;
    exports.apply = apply;
    return module.exports;
  },
});
