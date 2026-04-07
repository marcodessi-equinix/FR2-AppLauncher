import { getLatestChangelogEntry } from './changelog';

export interface AppVersionInfo {
  releaseVersion: string;
  buildVersion: string;
  buildDate: string;
}

export const getAppVersionInfo = (): AppVersionInfo => {
  const releaseVersion = getLatestChangelogEntry()?.version || __APP_VERSION__ || 'v0.1.0';
  const buildVersion = __APP_BUILD_VERSION__ || releaseVersion;
  const buildDate = __BUILD_DATE__;

  return {
    releaseVersion,
    buildVersion,
    buildDate,
  };
};