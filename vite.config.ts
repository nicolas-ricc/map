import { defineConfig } from "vite";

export default defineConfig({
  base: "/map/", // se sirve como project site bajo myxomatosis.xyz/map/
  build: { target: "es2022", sourcemap: false },
});
