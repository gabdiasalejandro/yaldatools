/// <reference types="vitest/config" />
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [process.env.VITEST ? null : reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  // The background-removal API (apps/api) runs on its own port during development.
  server: {
    proxy: { "/api": "http://127.0.0.1:8000" },
  },
  test: {
    include: ["app/**/*.test.ts"],
  },
});
