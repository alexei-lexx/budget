import {
  createRouter,
  createWebHistory,
  type NavigationGuardNext,
  type RouteLocationNormalized,
} from "vue-router";
import { watch } from "vue";
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
    beforeEnter: async (
      _to: RouteLocationNormalized,
      _from: RouteLocationNormalized,
      next: NavigationGuardNext,
    ) => {
      const { isAuthenticated, isLoading } = useAuth0();

      // Wait for Auth0 to finish loading
      if (isLoading.value) {
        await new Promise<void>((resolve) => {
          const stopWatching = watch(
            isLoading,
            (loading) => {
              if (!loading) {
                stopWatching();
                resolve();
              }
            },
            { immediate: true },
          );
        });
      }

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
