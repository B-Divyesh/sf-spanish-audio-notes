import { defineConfig } from "vite";

export default defineConfig({
  root: "app",
  publicDir: "../public",
  build: {
    outDir: "../dist/app",
    emptyOutDir: true,
    target: "es2022",
    sourcemap: false,
  },
  clearScreen: false,
  server: { port: 1420, strictPort: true },
});
