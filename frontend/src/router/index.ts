import {
  createRouter,
  createWebHistory,
  type NavigationGuardNext,
  type RouteLocationNormalized,
} from "vue-router";
import { watch } from "vue";
import SignIn from "@/views/SignIn.vue";
import Accounts from "@/views/Accounts.vue";
import Categories from "@/views/Categories.vue";
import Transactions from "@/views/Transactions.vue";
import ByCategoryReport from "@/views/ByCategoryReport.vue";
import Trends from "@/views/Trends.vue";
import Assistant from "@/views/Assistant.vue";
import Settings from "@/views/Settings.vue";
import { useAuth } from "@/composables/useAuth";

declare module "vue-router" {
  interface RouteMeta {
    // i18n key for the route's title in the app bar (see App.vue).
    // It is undefined until the router resolves its first navigation.
    titleKey?: string;
  }
}

// Reusable authentication guard
const requireAuth = async (
  _to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext,
) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Wait for auth to finish loading
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
    next({ name: "SignIn" });
  }
};

const routes = [
  {
    path: "/",
    name: "SignIn",
    component: SignIn,
    meta: { titleKey: "nav.signIn" },
  },
  {
    path: "/accounts",
    name: "Accounts",
    component: Accounts,
    beforeEnter: requireAuth,
    meta: { titleKey: "nav.accounts" },
  },
  {
    path: "/categories",
    name: "Categories",
    component: Categories,
    beforeEnter: requireAuth,
    meta: { titleKey: "nav.categories" },
  },
  {
    path: "/transactions",
    name: "Transactions",
    component: Transactions,
    beforeEnter: requireAuth,
    meta: { titleKey: "nav.transactions" },
  },
  {
    path: "/reports/by-category",
    name: "ByCategoryReport",
    component: ByCategoryReport,
    beforeEnter: requireAuth,
    meta: { titleKey: "nav.reports" },
  },
  {
    path: "/trends",
    name: "Trends",
    component: Trends,
    beforeEnter: requireAuth,
    meta: { titleKey: "nav.trends" },
  },
  {
    path: "/assistant",
    name: "Assistant",
    component: Assistant,
    beforeEnter: requireAuth,
    meta: { titleKey: "nav.assistant" },
  },
  {
    path: "/settings",
    name: "Settings",
    component: Settings,
    beforeEnter: requireAuth,
    meta: { titleKey: "nav.settings" },
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
