module.exports = {
  extends: "eslint:recommended",
  parser: "vue-eslint-parser",
  parserOptions: {
    sourceType: "module",
    ecmaVersion: "latest",
    parser: "@typescript-eslint/parser",
  },
  overrides: [
    {
      files: ["*.ts", "*.js", "*.vue", "*.mts", "*.cts", "*.tsx"],
      rules: {
        "no-undef": "off",

        "no-unused-vars": "warn",
      },
    },
  ],
};
