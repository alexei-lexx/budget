import { globalIgnores } from "eslint/config";
import { defineConfigWithVueTs, vueTsConfigs } from "@vue/eslint-config-typescript";
import pluginVue from "eslint-plugin-vue";
import pluginVueI18n from "@intlify/eslint-plugin-vue-i18n";
import skipFormatting from "@vue/eslint-config-prettier/skip-formatting";

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs(
  {
    name: "app/files-to-lint",
    files: ["**/*.{ts,mts,tsx,vue}"],
  },

  globalIgnores(["**/dist/**", "**/dist-ssr/**", "**/coverage/**", "**/__generated__/**"]),

  pluginVue.configs["flat/essential"],
  vueTsConfigs.recommended,
  pluginVueI18n.configs["flat/base"],
  {
    name: "app/vue-i18n",
    settings: {
      "vue-i18n": {
        localeDir: "./src/locales/*.json",
      },
    },
    rules: {
      "@intlify/vue-i18n/no-missing-keys": "error",
      "@intlify/vue-i18n/no-unused-keys": ["error", { extensions: [".ts", ".vue"] }],
    },
  },
  skipFormatting,
);
