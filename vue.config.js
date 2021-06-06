module.exports = {
  pluginOptions: {
    i18n: {
      locale: "en",
      fallbackLocale: "en",
      localeDir: "locales",
      enableLegacy: true,
      runtimeOnly: false,
      compositionOnly: false,
      fullInstall: true,
    },
  },
  chainWebpack: (config) => {
    config.plugin("define").tap((args) => {
      args[0] = {
        ...args[0],
        __INTLIFY_PROD_DEVTOOLS__: false,
        __VUE_I18N_FULL_INSTALL__: true,
        __VUE_I18N_LEGACY_API__: true,
      };
      return args;
    });
  },
  configureWebpack: {
    resolve: {
      symlinks: false, // 使用npm link
    },
    devServer: {
      headers: { "Access-Control-Allow-Origin": "*" },
    },
  },
};
