import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

const headers = (headers) => ({
  name: "headers",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      for (const [key, value] of Object.entries(headers)) {
        res.setHeader(key, value);
      }
      next();
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    headers({
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    }),
  ],
});
