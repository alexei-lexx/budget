import { createApp, h, provide } from "vue";
import { DefaultApolloClient } from "@vue/apollo-composable";
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
  .use(vuetify)
  .mount("#app");
