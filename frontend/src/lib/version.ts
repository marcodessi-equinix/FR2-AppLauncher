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

const createDisplayVersion = (meta: typeof currentMeta): string => {
  return [meta.releaseVersion, meta.gitSha, meta.buildDate]
    .filter(Boolean)
    .join(' | ');
};

export const useAppVersion = (): AppVersionInfo => {
  return {
    releaseVersion: currentMeta.releaseVersion || 'v0.1.0',
    gitSha: currentMeta.gitSha || 'local',
    buildDate: currentMeta.buildDate,
    buildTime: currentMeta.buildTime || '',
    buildNumber: currentMeta.buildNumber || '',
    displayVersion: createDisplayVersion(currentMeta),
  };
};

/** @deprecated Use useAppVersion() hook instead */
export const getAppVersionInfo = (): AppVersionInfo => {
  return {
    releaseVersion: currentMeta.releaseVersion || 'v0.1.0',
    gitSha: currentMeta.gitSha || 'local',
    buildDate: currentMeta.buildDate,
    buildTime: currentMeta.buildTime || '',
    buildNumber: currentMeta.buildNumber || '',
    displayVersion: createDisplayVersion(currentMeta),
  };
};
