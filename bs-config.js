/*
 |--------------------------------------------------------------------------
 | Browser-sync config file
 |--------------------------------------------------------------------------
 |
 | For up-to-date information about the options:
 |   http://www.browsersync.io/docs/options/
 |
 | This configuration handles SPA routing for the AWallet application
 |
 */
module.exports = {
  ui: {
    port: 3001,
  },
  files: false,
  watchEvents: ["change"],
  watch: false,
  ignore: [],
  single: false,
  watchOptions: {
    ignoreInitial: true,
  },
  server: {
    baseDir: "dist",
    serveStaticOptions: {
      extensions: ["html"],
    },
  },
  proxy: false,
  port: 8080,
  middleware: [
    function (req, res, next) {
      // Handle SPA routing - serve index.html for all routes that don't exist as files
      if (req.url.indexOf("/") === 0 && req.url.indexOf(".") === -1) {
        req.url = "/index.html";
      }
      return next();
    },
  ],
  serveStatic: [],
  ghostMode: {
    clicks: true,
    scroll: true,
    location: true,
    forms: {
      submit: true,
      inputs: true,
      toggles: true,
    },
  },
  logLevel: "info",
  logPrefix: "Browsersync",
  logConnections: false,
  logFileChanges: true,
  logSnippet: true,
  rewriteRules: [],
  open: false,
  browser: "default",
  cors: false,
  xip: false,
  hostnameSuffix: false,
  reloadOnRestart: false,
  notify: true,
  scrollProportionally: true,
  scrollThrottle: 0,
  scrollRestoreTechnique: "window.name",
  scrollElements: [],
  scrollElementMapping: [],
  reloadDelay: 0,
  reloadDebounce: 500,
  reloadThrottle: 0,
  plugins: [],
  injectChanges: true,
  startPath: null,
  minify: true,
  host: null,
  localOnly: false,
  codeSync: true,
  timestamps: true,
  clientEvents: [
    "scroll",
    "scroll:element",
    "input:text",
    "input:toggles",
    "form:submit",
    "form:reset",
    "click",
  ],
  socket: {
    socketIoOptions: {
      log: false,
    },
    socketIoClientConfig: {
      reconnectionAttempts: 50,
    },
    path: "/browser-sync/socket.io",
    clientPath: "/browser-sync",
    namespace: "/browser-sync",
    clients: {
      heartbeatTimeout: 5000,
    },
  },
  tagNames: {
    less: "link",
    scss: "link",
    css: "link",
    jpg: "img",
    jpeg: "img",
    png: "img",
    svg: "img",
    gif: "img",
    js: "script",
  },
};
