import { createApp, h, provide } from "vue";
import { DefaultApolloClient } from "@vue/apollo-composable";
import { auth } from "./plugins/auth";
import { i18n } from "./plugins/i18n";
import { vuetify } from "./plugins/vuetify";
import { router } from "./router";
import App from "./App.vue";
import "./assets/main.css";
import { apolloClient } from "./apollo";

createApp({
  setup() {
    provide(DefaultApolloClient, apolloClient);
  },
  render: () => h(App),
})
  .use(auth)
  .use(i18n)
  .use(vuetify)
  .use(router)
  .mount("#app");
