import { config } from "@vue/test-utils";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { aliases, mdi } from "vuetify/iconsets/mdi";

// jsdom doesn't implement ResizeObserver; VTextarea needs it
window.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// jsdom doesn't implement matchMedia; Vuetify's useDisplay needs it
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

const vuetify = createVuetify({
  components,
  directives,
  icons: { defaultSet: "mdi", aliases, sets: { mdi } },
});

config.global.plugins = [vuetify];
