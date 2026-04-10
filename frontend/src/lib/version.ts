import React from 'react';

export interface AppVersionInfo {
  releaseVersion: string;
  gitSha: string;
  buildDate: string;
  buildTime: string;
  buildNumber: string;
  displayVersion: string;
}

interface RuntimeConfigMeta {
  API_URL?: string;
  BUILD_VERSION?: string;
  BUILD_DATE?: string;
  GIT_SHA?: string;
  BUILD_TIME?: string;
  BUILD_NUMBER?: string;
}

interface VersionApiPayload {
  version?: string;
  buildDate?: string;
  gitSha?: string;
}

const UNKNOWN_VALUE = 'unknown';
const DEFAULT_API_URL = '/api';
const INVALID_VALUES = new Set(['', 'local', 'not available']);
const INVALID_VERSION_VALUES = new Set(['', 'local', 'not available', 'unknown-local', 'v0.1.0']);
const listeners = new Set<() => void>();

let initializationPromise: Promise<AppVersionInfo> | null = null;
let currentVersionInfo: AppVersionInfo;

const isInvalidValue = (value: string | undefined): boolean => {
  const normalized = value?.trim().toLowerCase() || '';
  return INVALID_VALUES.has(normalized);
};

const isInvalidVersionValue = (value: string | undefined): boolean => {
  const normalized = value?.trim().toLowerCase() || '';
  return INVALID_VERSION_VALUES.has(normalized);
};

const normalizeVersion = (value: string | undefined): string => {
  if (isInvalidVersionValue(value)) {
    return UNKNOWN_VALUE;
  }

  const trimmed = value?.trim() || '';
  if (!trimmed) {
    return UNKNOWN_VALUE;
  }

  return trimmed.startsWith('v') ? trimmed : `v${trimmed}`;
};

const normalizeValue = (value: string | undefined, fallback = UNKNOWN_VALUE): string => {
  if (isInvalidValue(value)) {
    return fallback;
  }

  const trimmed = value?.trim() || '';
  return trimmed || fallback;
};

const getRuntimeConfig = (): RuntimeConfigMeta => {
  if (typeof window === 'undefined') {
    return {};
  }

  return window.RUNTIME_CONFIG || {};
};

const getApiBaseUrl = (): string => {
  const configured = normalizeValue(getRuntimeConfig().API_URL, DEFAULT_API_URL);
  return configured === UNKNOWN_VALUE ? DEFAULT_API_URL : configured.replace(/\/$/, '');
};

const getCompactBuildDate = (value: string): string => {
  const trimmed = value.trim();
  const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})T/);
  return isoMatch ? isoMatch[1] : trimmed;
};

const createDisplayVersion = (info: Omit<AppVersionInfo, 'displayVersion'>): string => {
  const parts = [
    info.releaseVersion,
    info.gitSha,
    info.buildDate === UNKNOWN_VALUE ? UNKNOWN_VALUE : getCompactBuildDate(info.buildDate),
  ].filter((value) => value !== UNKNOWN_VALUE);
  return parts.length ? parts.join(' | ') : UNKNOWN_VALUE;
};

const createVersionInfo = (input?: Partial<Omit<AppVersionInfo, 'displayVersion'>>): AppVersionInfo => {
  const baseInfo = {
    releaseVersion: normalizeVersion(input?.releaseVersion),
    gitSha: normalizeValue(input?.gitSha),
    buildDate: normalizeValue(input?.buildDate),
    buildTime: normalizeValue(input?.buildTime),
    buildNumber: normalizeValue(input?.buildNumber),
  };

  return {
    ...baseInfo,
    displayVersion: createDisplayVersion(baseInfo),
  };
};

const readRuntimeVersionInfo = (): AppVersionInfo => {
  const runtimeConfig = getRuntimeConfig();
  return createVersionInfo({
    releaseVersion: runtimeConfig.BUILD_VERSION,
    buildDate: runtimeConfig.BUILD_DATE,
    gitSha: runtimeConfig.GIT_SHA,
    buildTime: runtimeConfig.BUILD_TIME,
    buildNumber: runtimeConfig.BUILD_NUMBER,
  });
};

const hasResolvedProductionFields = (info: AppVersionInfo): boolean => {
  return info.releaseVersion !== UNKNOWN_VALUE && info.buildDate !== UNKNOWN_VALUE && info.gitSha !== UNKNOWN_VALUE;
};

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

const updateVersionInfo = (nextInfo: Partial<Omit<AppVersionInfo, 'displayVersion'>>) => {
  currentVersionInfo = createVersionInfo({
    ...currentVersionInfo,
    ...nextInfo,
  });
  emitChange();
};

const fetchVersionFromApi = async (): Promise<VersionApiPayload> => {
  const response = await fetch(`${getApiBaseUrl()}/version`, {
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Version request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as VersionApiPayload;
  return payload;
};

currentVersionInfo = readRuntimeVersionInfo();

export const initializeAppVersion = async (): Promise<AppVersionInfo> => {
  if (hasResolvedProductionFields(currentVersionInfo)) {
    return currentVersionInfo;
  }

  if (!initializationPromise) {
    initializationPromise = (async () => {
      try {
        const payload = await fetchVersionFromApi();
        updateVersionInfo({
          releaseVersion: payload.version,
          buildDate: payload.buildDate,
          gitSha: payload.gitSha,
        });
      } catch {
        updateVersionInfo({});
      } finally {
        initializationPromise = null;
      }

      return currentVersionInfo;
    })();
  }

  return initializationPromise;
};

export const useAppVersion = (): AppVersionInfo => {
  return React.useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      void initializeAppVersion();

      return () => {
        listeners.delete(listener);
      };
    },
    () => currentVersionInfo,
    () => currentVersionInfo,
  );
};

/** @deprecated Use useAppVersion() hook instead */
export const getAppVersionInfo = (): AppVersionInfo => {
  return currentVersionInfo;
};
