import { createApp, h, provide } from "vue";
import { DefaultApolloClient } from "@vue/apollo-composable";
import { auth0 } from "./plugins/auth0";
import { vuetify } from "./plugins/vuetify";
import App from "./App.vue";
import "./assets/main.css";
import { apolloClient } from "./apollo";

createApp({
  setup() {
    provide(DefaultApolloClient, apolloClient);
  },
  render: () => h(App),
})
  .use(auth0)
  .use(vuetify)
  .mount("#app");
