import fs from "fs"
import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const resolvePackageVersion = (): string => {
  const candidatePaths = [
    path.resolve(__dirname, '../package.json'),
    path.resolve(__dirname, './package.json'),
  ]

  for (const packageJsonPath of candidatePaths) {
    if (!fs.existsSync(packageJsonPath)) {
      continue
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as { version?: string }
      if (packageJson.version) {
        return packageJson.version
      }
    } catch {
      continue
    }
  }

  return '0.1.0'
}

const createBuildRevision = (): string =>
  new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)

const createDisplayBuildVersion = (releaseVersion: string, buildNumber: string): string => {
  const normalizedReleaseVersion = releaseVersion.replace(/^v/i, '')
  const versionParts = normalizedReleaseVersion.split('.')

  if (versionParts.length >= 3 && versionParts[2] === '0') {
    return `${versionParts[0]}.${versionParts[1]}.${buildNumber}`
  }

  return `${normalizedReleaseVersion}.${buildNumber}`
}

const resolvedAppVersion = process.env.VITE_APP_VERSION || `v${resolvePackageVersion()}`
const resolvedBuildRevision = process.env.VITE_BUILD_REVISION || createBuildRevision()
const resolvedBuildNumber = resolvedBuildRevision.slice(-3)
const resolvedBuildVersion = createDisplayBuildVersion(resolvedAppVersion, resolvedBuildNumber)
const resolvedBuildDate = new Date().toISOString().slice(0, 10)

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(resolvedAppVersion),
    __APP_BUILD_VERSION__: JSON.stringify(resolvedBuildVersion),
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
