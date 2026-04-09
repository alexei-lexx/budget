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
import Assistant from "@/views/Assistant.vue";
import Settings from "@/views/Settings.vue";
import { useAuth } from "@/composables/useAuth";

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
  },
  {
    path: "/accounts",
    name: "Accounts",
    component: Accounts,
    beforeEnter: requireAuth,
  },
  {
    path: "/categories",
    name: "Categories",
    component: Categories,
    beforeEnter: requireAuth,
  },
  {
    path: "/transactions",
    name: "Transactions",
    component: Transactions,
    beforeEnter: requireAuth,
  },
  {
    path: "/reports/by-category",
    name: "ByCategoryReport",
    component: ByCategoryReport,
    beforeEnter: requireAuth,
  },
  {
    path: "/assistant",
    name: "Assistant",
    component: Assistant,
    beforeEnter: requireAuth,
  },
  {
    path: "/settings",
    name: "Settings",
    component: Settings,
    beforeEnter: requireAuth,
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
