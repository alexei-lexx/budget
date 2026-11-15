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
          },
          {
            // maskable = full-bleed icon used on Android home screen (cropped to squircle)
            src: "pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
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
  server: {
    // Exit when the port is busy instead of trying the next port,
    // because the port is part of the token issuer
    // that the backend checks.
    strictPort: true,
    proxy: {
      "/graphql": "http://localhost:4000",
      // The mock OIDC server builds the token issuer from the Host header and the path.
      // So keep both (no changeOrigin, no rewrite) to get http://localhost:5173/oidc.
      // Use the object form, because the string form sets changeOrigin.
      "/oidc": { target: "http://localhost:8080" },
    },
  },
});
