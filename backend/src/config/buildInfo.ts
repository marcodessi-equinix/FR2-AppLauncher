import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { runtimeConfig } from './runtime';

export interface BuildInfo {
  releaseVersion: string;
  gitSha: string;
  buildDate: string;
  buildTime: string;
  buildNumber: string;
}

const repoRoot = path.resolve(runtimeConfig.backendRoot, '..');
const rootPackageJsonPath = path.join(repoRoot, 'package.json');
const backendPackageJsonPath = path.join(runtimeConfig.backendRoot, 'package.json');

const readPackageVersion = (filePath: string): string | null => {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf8')) as { version?: string };
    return typeof packageJson.version === 'string' && packageJson.version.trim()
      ? packageJson.version.trim()
      : null;
  } catch {
    return null;
  }
};

const normalizeReleaseVersion = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'v0.1.0';
  }

  return trimmed.startsWith('v') ? trimmed : `v${trimmed}`;
};

const runGit = (args: string[]): string => {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();
  } catch {
    return '';
  }
};

const resolveReleaseVersion = (): string => {
  const envVersion = process.env.APP_VERSION || process.env.VITE_APP_VERSION;
  if (envVersion?.trim()) {
    return normalizeReleaseVersion(envVersion);
  }

  const rootVersion = readPackageVersion(rootPackageJsonPath);
  if (rootVersion) {
    return normalizeReleaseVersion(rootVersion);
  }

  const backendVersion = readPackageVersion(backendPackageJsonPath);
  if (backendVersion) {
    return normalizeReleaseVersion(backendVersion);
  }

  return 'v0.1.0';
};

const resolveGitSha = (): string => {
  const envSha = process.env.APP_GIT_SHA || process.env.GIT_SHA || process.env.VITE_GIT_SHA;
  if (envSha?.trim()) {
    return envSha.trim().slice(0, 12);
  }

  const gitSha = runGit(['rev-parse', '--short=7', 'HEAD']);
  return gitSha || 'local';
};

const resolveBuildNumber = (): string => {
  const explicitBuildNumber = process.env.APP_BUILD_NUMBER
    || process.env.BUILD_NUMBER
    || process.env.GITHUB_RUN_NUMBER
    || process.env.CI_PIPELINE_IID
    || process.env.CI_PIPELINE_ID;

  if (explicitBuildNumber?.trim()) {
    return explicitBuildNumber.trim();
  }

  return runGit(['rev-list', '--count', 'HEAD']);
};

export const getBuildInfo = (): BuildInfo => {
  const now = new Date();

  return {
    releaseVersion: resolveReleaseVersion(),
    gitSha: resolveGitSha(),
    buildDate: (process.env.APP_BUILD_DATE || process.env.BUILD_DATE || now.toISOString().slice(0, 10)).trim(),
    buildTime: (process.env.APP_BUILD_TIME || process.env.BUILD_TIME || now.toISOString().slice(11, 19)).trim(),
    buildNumber: resolveBuildNumber(),
  };
};
