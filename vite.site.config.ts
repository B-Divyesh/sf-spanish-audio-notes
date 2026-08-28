import { defineConfig } from "vite";

export default defineConfig({
  root: "site",
  publicDir: "../public",
  build: {
    outDir: "../dist/site",
    emptyOutDir: true,
    target: "es2022",
    sourcemap: false,
    rollupOptions: {
      input: {
        index: "site/index.html",
        privacy: "site/privacy/index.html",
        terms: "site/terms/index.html"
      }
    }
  }
});
