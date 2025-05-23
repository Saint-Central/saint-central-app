// eslint.config.js
const globals = require("globals");
const expoConfig = require("eslint-config-expo/flat");
const eslintConfigPrettier = require("eslint-config-prettier/flat");
const tseslint = require("typescript-eslint");

module.exports = tseslint.config([
  ...expoConfig,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  eslintConfigPrettier,
]);
