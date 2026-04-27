import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from "fs"

// https://vite.dev/config/
// Leer versión del package.json
const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
const appVersion = packageJson.version || 'unknown';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/modules": path.resolve(__dirname, "/src/"),
    },
  },
  define: {
    'import.meta.env.PACKAGE_VERSION': JSON.stringify(appVersion),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, "/")

          if (!normalizedId.includes("/node_modules/")) {
            return
          }
          if (normalizedId.includes("/react-router")) {
            return "router"
          }
          if (normalizedId.includes("/@radix-ui/")) {
            return "radix"
          }
          if (normalizedId.includes("/@tanstack/react-table/")) {
            return "table"
          }
          if (
            normalizedId.includes("/framer-motion/") ||
            normalizedId.includes("/motion/")
          ) {
            return "motion"
          }
        },
      },
    },
  },
})
