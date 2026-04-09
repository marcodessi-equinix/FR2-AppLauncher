import { buildMeta } from 'virtual:build-meta';

export interface AppVersionInfo {
  releaseVersion: string;
  gitSha: string;
  buildDate: string;
  buildTime: string;
  buildNumber: string;
  displayVersion: string;
}

const currentMeta = { ...buildMeta };
const FALLBACK_RELEASE_VERSION = 'v0.1.0';
const FALLBACK_GIT_SHA = 'local';

const normalizeMetaValue = (value: string | undefined, fallback = ''): string => {
  const trimmed = value?.trim() || '';
  return trimmed || fallback;
};

const createDisplayVersion = (meta: typeof currentMeta): string => {
  return [
    normalizeMetaValue(meta.releaseVersion, FALLBACK_RELEASE_VERSION),
    normalizeMetaValue(meta.gitSha, FALLBACK_GIT_SHA),
    normalizeMetaValue(meta.buildDate),
  ]
    .filter(Boolean)
    .join(' | ');
};

const createVersionInfo = (): AppVersionInfo => ({
  releaseVersion: normalizeMetaValue(currentMeta.releaseVersion, FALLBACK_RELEASE_VERSION),
  gitSha: normalizeMetaValue(currentMeta.gitSha, FALLBACK_GIT_SHA),
  buildDate: normalizeMetaValue(currentMeta.buildDate),
  buildTime: normalizeMetaValue(currentMeta.buildTime),
  buildNumber: normalizeMetaValue(currentMeta.buildNumber),
  displayVersion: createDisplayVersion(currentMeta),
});

export const useAppVersion = (): AppVersionInfo => {
  return createVersionInfo();
};

/** @deprecated Use useAppVersion() hook instead */
export const getAppVersionInfo = (): AppVersionInfo => {
  return createVersionInfo();
};
