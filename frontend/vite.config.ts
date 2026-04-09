import fs from "fs"
import path from "path"
import { execFileSync } from "child_process"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const repoRoot = path.resolve(__dirname, '..')
const rootPackageJsonPath = path.join(repoRoot, 'package.json')
const frontendPackageJsonPath = path.join(__dirname, 'package.json')

const readPackageVersion = (packageJsonPath: string): string | null => {
  if (!fs.existsSync(packageJsonPath)) {
    return null
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as { version?: string }
    return packageJson.version?.trim() || null
  } catch {
    return null
  }
}

const normalizeReleaseVersion = (value: string): string => {
  const trimmed = value.trim()
  if (!trimmed) {
    return 'v0.1.0'
  }

  return trimmed.startsWith('v') ? trimmed : `v${trimmed}`
}

const runGit = (args: string[], cwd: string): string =>
  execFileSync('git', args, {
    cwd,
    stdio: ['ignore', 'pipe', 'ignore'],
  }).toString().trim()

const resolveReleaseVersion = (): string => {
  const envVersion = process.env.APP_VERSION || process.env.VITE_APP_VERSION
  if (envVersion?.trim()) {
    return normalizeReleaseVersion(envVersion)
  }

  return normalizeReleaseVersion(
    readPackageVersion(rootPackageJsonPath)
    || readPackageVersion(frontendPackageJsonPath)
    || '0.1.0'
  )
}

const hasGitMetadata = (): boolean => {
  return fs.existsSync(path.join(repoRoot, '.git'))
}

const resolveGitSha = (): string => {
  const envSha = process.env.APP_GIT_SHA || process.env.GIT_SHA || process.env.VITE_GIT_SHA
  if (envSha?.trim()) {
    return envSha.trim().slice(0, 12)
  }

  try {
    if (!hasGitMetadata()) {
      return 'local'
    }

    return runGit(['rev-parse', '--short=7', 'HEAD'], repoRoot) || 'local'
  } catch {
    return 'local'
  }
}

const resolveBuildNumber = (): string => {
  const explicitBuildNumber = process.env.APP_BUILD_NUMBER
    || process.env.BUILD_NUMBER
    || process.env.GITHUB_RUN_NUMBER
    || process.env.CI_PIPELINE_IID
    || process.env.CI_PIPELINE_ID

  if (explicitBuildNumber?.trim()) {
    return explicitBuildNumber.trim()
  }

  try {
    if (!hasGitMetadata()) {
      return ''
    }

    return runGit(['rev-list', '--count', 'HEAD'], repoRoot)
  } catch {
    return ''
  }
}

function buildMetaPlugin(): import('vite').Plugin {
  const virtualModuleId = 'virtual:build-meta'
  const resolvedId = '\0' + virtualModuleId

  const computeMeta = () => {
    const releaseVersion = resolveReleaseVersion()
    const gitSha = resolveGitSha()
    const buildNumber = resolveBuildNumber()
    const now = new Date()
    const buildDate = (process.env.APP_BUILD_DATE || process.env.BUILD_DATE || now.toISOString().slice(0, 10)).trim()
    const buildTime = (process.env.APP_BUILD_TIME || process.env.BUILD_TIME || now.toISOString().slice(11, 19)).trim()

    return {
      releaseVersion,
      gitSha,
      buildDate,
      buildTime,
      buildNumber,
    }
  }

  return {
    name: 'build-meta',
    resolveId(id) {
      if (id === virtualModuleId) return resolvedId
    },
    load(id) {
      if (id === resolvedId) {
        const meta = computeMeta()
        return `export const buildMeta = ${JSON.stringify(meta)};`
      }
    },
  }
}

export default defineConfig({
  plugins: [buildMetaPlugin(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5001,
    strictPort: true,
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
    strictPort: true,
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
