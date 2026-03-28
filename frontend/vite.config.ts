import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    VitePWA({
      // When a new service worker is available, activate it immediately
      // without waiting for the user to close all tabs
      registerType: "autoUpdate",
      // Inject the service worker registration script automatically
      // into index.html (no manual call needed)
      injectRegister: "auto",
      manifest: {
        // Full app name shown on install prompt and app store listings
        name: "Personal Budget Tracker",
        // Short name shown under the icon on the home screen (limited space)
        short_name: "Budget",
        // Shown on install prompt in some browsers
        description: "Track your personal budget",
        // Color of the browser toolbar / status bar when the app is open
        theme_color: "#ff6b35",
        // Background color of the splash screen shown while the app is loading
        background_color: "#ffffff",
        // "standalone" = opens without browser UI (no address bar) — required for proper PWA install instead of shortcut
        display: "standalone",
        // The URL opened when the installed app is launched
        start_url: "/",
        icons: [
          {
            // 192x192 is the minimum size required by Chrome to show the install prompt
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            // 512x512 is used for splash screen and high-res displays
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            // "maskable" = icon can be cropped to a circle/squircle on Android; "any" = used as-is elsewhere
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
