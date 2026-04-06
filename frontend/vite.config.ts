import fs from "fs"
import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const rootPackageJsonPath = path.resolve(__dirname, '../package.json')
const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf8')) as { version?: string }
const resolvedAppVersion = process.env.VITE_APP_VERSION || `v${rootPackageJson.version || '0.1.0'}`
const resolvedBuildDate = new Date().toISOString().slice(0, 10)

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(resolvedAppVersion),
    __BUILD_DATE__: JSON.stringify(resolvedBuildDate),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5001,
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },
  preview: {
    host: "0.0.0.0",
    port: 5001,
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      maxParallelFileOps: 20,
      output: {
      }
    }
  }
})
