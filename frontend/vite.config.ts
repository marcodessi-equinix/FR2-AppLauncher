import fs from "fs"
import crypto from "crypto"
import path from "path"
import { execFileSync } from "child_process"
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

const normalizeBuildNumber = (value: string): string => {
  const trimmed = value.trim()
  if (!trimmed) {
    return '001'
  }

  if (/^\d+$/.test(trimmed)) {
    return trimmed.padStart(3, '0')
  }

  return trimmed
}

const createDisplayBuildVersion = (releaseVersion: string, buildNumber: string): string => {
  const normalizedReleaseVersion = releaseVersion.replace(/^v/i, '')
  const versionParts = normalizedReleaseVersion.split('.')

  if (versionParts.length >= 3 && versionParts[2] === '0') {
    return `${versionParts[0]}.${versionParts[1]}.${buildNumber}`
  }

  return `${normalizedReleaseVersion}.${buildNumber}`
}

const runGit = (args: string[], cwd: string): string =>
  execFileSync('git', args, {
    cwd,
    stdio: ['ignore', 'pipe', 'ignore'],
  }).toString().trim()

const collectFiles = (targetPath: string): string[] => {
  if (!fs.existsSync(targetPath)) {
    return []
  }

  const stat = fs.statSync(targetPath)
  if (stat.isFile()) {
    return [targetPath]
  }

  return fs.readdirSync(targetPath)
    .sort((left, right) => left.localeCompare(right))
    .flatMap((entry) => collectFiles(path.join(targetPath, entry)))
}

const resolveContentBuildNumber = (): string => {
  try {
    const repoRoot = path.resolve(__dirname, '..')
    const fingerprintTargets = [
      path.join(repoRoot, 'package.json'),
      path.join(__dirname, 'package.json'),
      path.join(__dirname, 'index.html'),
      path.join(__dirname, 'vite.config.ts'),
      path.join(__dirname, 'tailwind.config.js'),
      path.join(__dirname, 'postcss.config.js'),
      path.join(__dirname, 'src'),
      path.join(__dirname, 'public'),
    ]

    const hash = crypto.createHash('sha1')
    let hasInputs = false

    for (const targetPath of fingerprintTargets) {
      for (const filePath of collectFiles(targetPath)) {
        hasInputs = true
        hash.update(path.relative(repoRoot, filePath))
        hash.update('\n')
        hash.update(fs.readFileSync(filePath))
        hash.update('\n')
      }
    }

    return hasInputs ? hash.digest('hex').slice(0, 6).toUpperCase() : 'LOCAL'
  } catch {
    return 'LOCAL'
  }
}

const resolveGitBuildNumber = (releaseVersion: string): string | null => {
  try {
    const repoRoot = path.resolve(__dirname, '..')
    const gitDir = path.join(repoRoot, '.git')
    if (!fs.existsSync(gitDir)) {
      return null
    }

    const normalizedReleaseVersion = releaseVersion.replace(/^v/i, '')
    const anchorCandidates = runGit([
      'log',
      '--reverse',
      '--format=%H',
      '-S',
      `"version": "${normalizedReleaseVersion}"`,
      '--',
      'package.json',
    ], repoRoot)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    if (anchorCandidates.length > 0) {
      const anchorCommit = anchorCandidates[0]
      const commitsSinceAnchor = runGit(['rev-list', '--count', `${anchorCommit}..HEAD`], repoRoot)
      const sequence = Number.parseInt(commitsSinceAnchor || '0', 10) + 1
      return normalizeBuildNumber(String(sequence))
    }

    const count = runGit(['rev-list', '--count', 'HEAD'], repoRoot)

    return count ? normalizeBuildNumber(count) : null
  } catch {
    return null
  }
}

const resolveBuildNumber = (releaseVersion: string): string => {
  return resolveGitBuildNumber(releaseVersion) || resolveContentBuildNumber()
}

function buildMetaPlugin(): import('vite').Plugin {
  const virtualModuleId = 'virtual:build-meta'
  const resolvedId = '\0' + virtualModuleId

  const computeMeta = () => {
    const appVersion = process.env.VITE_APP_VERSION || `v${resolvePackageVersion()}`
    const buildNumber = resolveBuildNumber(appVersion)
    const buildVersion = createDisplayBuildVersion(appVersion, buildNumber)
    const now = new Date()
    const buildDate = now.toISOString().slice(0, 10)
    const buildTime = now.toISOString().slice(11, 19)
    return { appVersion, buildVersion, buildDate, buildTime }
  }

  return {
    name: 'build-meta',
    resolveId(id) {
      if (id === virtualModuleId) return resolvedId
    },
    load(id) {
      if (id === resolvedId) {
        const meta = computeMeta()
        return [
          `export const buildMeta = ${JSON.stringify(meta)};`,
          `if (import.meta.hot) {`,
          `  import.meta.hot.on('build-meta:update', (data) => {`,
          `    Object.assign(buildMeta, data);`,
          `    window.dispatchEvent(new CustomEvent('build-meta:update', { detail: data }));`,
          `  });`,
          `}`,
        ].join('\n')
      }
    },
    handleHotUpdate({ server }) {
      const meta = computeMeta()
      server.hot.send('build-meta:update', meta)
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
