window.__ModuleLoader__.load({
  id: '@wha7ever/dsh-firefly-theme',
  factory(require) {
    const module = { exports: {} };
    const exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

    // Firefly palette: mint/teal surfaces with a warm firefly accent.
    const TOKENS = {
      '--dsw-alias-bg-base': { light: '#F2F9F4', dark: '#0A1412' },
      '--dsw-alias-bg-layer-1': { light: '#FFFFFF', dark: '#0F1B18' },
      '--dsw-alias-bg-layer-2': { light: '#E7F3EB', dark: '#152521' },
      '--dsw-alias-bg-overlay': { light: '#FFFFFF', dark: '#1A2C26' },
      '--dsw-alias-border-l1': { light: '#D8EADF', dark: '#243A33' },
      '--dsw-alias-border-l2': { light: '#B8D8C4', dark: '#355447' },
      '--dsw-alias-brand-primary': { light: '#14A36E', dark: '#63D6A0' },
      '--dsw-alias-label-primary': { light: '#173029', dark: '#E6F2EC' },
      '--dsw-alias-label-secondary': { light: '#5C7A6D', dark: '#8CA99C' },
      '--dsw-alias-state-error-primary': { light: '#D64545', dark: '#EF8B8B' },
      '--dsw-alias-state-success-primary': { light: '#149B61', dark: '#5FD4A1' },
      '--dsw-alias-state-warn-primary': { light: '#C0831B', dark: '#E9C46A' },
      '--dsw-specific-sidebar-fill': { light: '#E9F4EC', dark: '#0C1714' },
    };

    const TEXT_COLOR_CSS = 'body{color:var(--dsw-alias-label-primary)}';

    function installInheritedTextColor(ctx) {
      ctx.effect(() => {
        if (typeof document === 'undefined') return;
        const style = document.createElement('style');
        style.dataset.plugin = '@wha7ever/dsh-firefly-theme';
        style.dataset.pluginCss = '@wha7ever/dsh-firefly-theme/inherited-text-color';
        style.textContent = TEXT_COLOR_CSS;
        document.head.append(style);
        return () => style.remove();
      }, '@wha7ever/dsh-firefly-theme: inherited text color');
    }

    function apply(ctx) {
      ctx.effect(() => ctx.theme.overrideTokens('@wha7ever/dsh-firefly-theme', TOKENS));
      installInheritedTextColor(ctx);
    }

    exports.inject = ['theme'];
    exports.apply = apply;
    return module.exports;
  },
});
