import { createRouter, createWebHistory, type NavigationGuardNext, type RouteLocationNormalized } from "vue-router";
import Dashboard from "@/views/Dashboard.vue";
import Accounts from "@/views/Accounts.vue";
import { useAuth0 } from "@auth0/auth0-vue";

const routes = [
  {
    path: "/",
    name: "Dashboard",
    component: Dashboard,
  },
  {
    path: "/accounts",
    name: "Accounts",
    component: Accounts,
    beforeEnter: (_to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
      const { isAuthenticated } = useAuth0();
      if (isAuthenticated.value) {
        next();
      } else {
        next({ name: "Dashboard" });
      }
    },
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
