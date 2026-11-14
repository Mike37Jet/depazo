import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

const API_PROXY_TARGET = process.env.DEPAZO_API_PROXY_TARGET ?? "http://localhost:8000";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "depazo",
        short_name: "depazo",
        description: "Departamentos en arriendo en Quito que encajan contigo",
        lang: "es-EC",
        start_url: "/",
        display: "standalone",
        background_color: "#F2F2F7",
        theme_color: "#F2F2F7",
        icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,webmanifest}"],
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
      },
    }),
  ],
  server: {
    proxy: {
      "/api": {
        target: API_PROXY_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
