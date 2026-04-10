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

export interface PublicVersionInfo {
  version: string;
  buildDate: string;
  gitSha: string;
}

interface EmbeddedBuildMetadata {
  buildVersion?: string;
  buildDate?: string;
  gitSha?: string;
  buildTime?: string;
  buildNumber?: string;
}

const UNKNOWN_VALUE = 'unknown';

const workspaceRoot = path.resolve(runtimeConfig.backendRoot, '..');
const packageVersionCandidates = [
  path.join(workspaceRoot, 'package.json'),
  path.join(runtimeConfig.backendRoot, 'package.json'),
];
const metadataFileCandidates = [
  path.join(runtimeConfig.backendRoot, 'build-metadata.env'),
  path.join(workspaceRoot, 'build-metadata.env'),
];

let embeddedMetadataCache: EmbeddedBuildMetadata | null | undefined;

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
    return UNKNOWN_VALUE;
  }

  return trimmed.startsWith('v') ? trimmed : `v${trimmed}`;
};

const normalizeValue = (value: string | undefined): string => {
  const trimmed = value?.trim() || '';
  return trimmed || UNKNOWN_VALUE;
};

const normalizeGitSha = (value: string | undefined): string => {
  const trimmed = value?.trim() || '';
  return trimmed ? trimmed.slice(0, 12) : UNKNOWN_VALUE;
};

const parseEmbeddedMetadata = (filePath: string): EmbeddedBuildMetadata => {
  const raw = fs.readFileSync(filePath, 'utf8');
  const metadata: EmbeddedBuildMetadata = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    let value = trimmedLine.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    switch (key) {
      case 'IMAGE_BUILD_VERSION':
        metadata.buildVersion = value;
        break;
      case 'IMAGE_BUILD_DATE':
        metadata.buildDate = value;
        break;
      case 'IMAGE_GIT_SHA':
        metadata.gitSha = value;
        break;
      case 'IMAGE_BUILD_TIME':
        metadata.buildTime = value;
        break;
      case 'IMAGE_BUILD_NUMBER':
        metadata.buildNumber = value;
        break;
      default:
        break;
    }
  }

  return metadata;
};

const readEmbeddedMetadata = (): EmbeddedBuildMetadata => {
  if (embeddedMetadataCache !== undefined) {
    return embeddedMetadataCache || {};
  }

  for (const candidate of metadataFileCandidates) {
    if (!fs.existsSync(candidate)) {
      continue;
    }

    embeddedMetadataCache = parseEmbeddedMetadata(candidate);
    return embeddedMetadataCache;
  }

  embeddedMetadataCache = null;
  return {};
};

const derivePackageVersion = (): string => {
  for (const candidate of packageVersionCandidates) {
    const version = readPackageVersion(candidate);
    if (version) {
      return normalizeReleaseVersion(version);
    }
  }

  return UNKNOWN_VALUE;
};

const runGit = (args: string[]): string => {
  try {
    const gitRoot = fs.existsSync(path.join(workspaceRoot, '.git')) ? workspaceRoot : runtimeConfig.backendRoot;
    return execFileSync('git', args, {
      cwd: gitRoot,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();
  } catch {
    return '';
  }
};

const resolveReleaseVersion = (): string => {
  const envVersion = process.env.BUILD_VERSION;
  if (envVersion?.trim()) {
    return normalizeReleaseVersion(envVersion);
  }

  const embeddedVersion = readEmbeddedMetadata().buildVersion;
  if (embeddedVersion?.trim()) {
    return normalizeReleaseVersion(embeddedVersion);
  }

  return derivePackageVersion();
};

const resolveGitSha = (): string => {
  const envSha = process.env.GIT_SHA;
  if (envSha?.trim()) {
    return normalizeGitSha(envSha);
  }

  const embeddedGitSha = readEmbeddedMetadata().gitSha;
  if (embeddedGitSha?.trim()) {
    return normalizeGitSha(embeddedGitSha);
  }

  const gitSha = runGit(['rev-parse', '--short=7', 'HEAD']);
  return normalizeGitSha(gitSha);
};

const resolveBuildNumber = (): string => {
  const explicitBuildNumber = process.env.BUILD_NUMBER
    || process.env.GITHUB_RUN_NUMBER
    || process.env.CI_PIPELINE_IID
    || process.env.CI_PIPELINE_ID;

  if (explicitBuildNumber?.trim()) {
    return explicitBuildNumber.trim();
  }

  const embeddedBuildNumber = readEmbeddedMetadata().buildNumber;
  if (embeddedBuildNumber?.trim()) {
    return embeddedBuildNumber.trim();
  }

  return runGit(['rev-list', '--count', 'HEAD']) || UNKNOWN_VALUE;
};

const resolveBuildDate = (): string => {
  if (process.env.BUILD_DATE?.trim()) {
    return process.env.BUILD_DATE.trim();
  }

  const embeddedBuildDate = readEmbeddedMetadata().buildDate;
  if (embeddedBuildDate?.trim()) {
    return embeddedBuildDate.trim();
  }

  return runtimeConfig.nodeEnv === 'production' ? UNKNOWN_VALUE : new Date().toISOString();
};

const resolveBuildTime = (): string => {
  if (process.env.BUILD_TIME?.trim()) {
    return process.env.BUILD_TIME.trim();
  }

  const embeddedBuildTime = readEmbeddedMetadata().buildTime;
  if (embeddedBuildTime?.trim()) {
    return embeddedBuildTime.trim();
  }

  const buildDate = resolveBuildDate();
  const isoTimestampMatch = buildDate.match(/T(\d{2}:\d{2}:\d{2})/);
  if (isoTimestampMatch) {
    return `${isoTimestampMatch[1]} UTC`;
  }

  return runtimeConfig.nodeEnv === 'production' ? UNKNOWN_VALUE : `${new Date().toISOString().slice(11, 19)} UTC`;
};

export const getBuildInfo = (): BuildInfo => {
  return {
    releaseVersion: resolveReleaseVersion(),
    gitSha: resolveGitSha(),
    buildDate: resolveBuildDate(),
    buildTime: resolveBuildTime(),
    buildNumber: resolveBuildNumber(),
  };
};

export const getPublicVersionInfo = (): PublicVersionInfo => {
  const buildInfo = getBuildInfo();

  return {
    version: normalizeReleaseVersion(buildInfo.releaseVersion),
    buildDate: normalizeValue(buildInfo.buildDate),
    gitSha: normalizeValue(buildInfo.gitSha),
  };
};
