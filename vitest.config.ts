import path from "path";
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
      "@/modules": path.resolve(dirname, "./src/modules"),
    },
  },
  test: {
    environment: "node",
  },
});
