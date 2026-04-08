import { useState, useEffect, useSyncExternalStore } from 'react';
import { buildMeta } from 'virtual:build-meta';
import { getLatestChangelogEntry } from './changelog';

export interface AppVersionInfo {
  releaseVersion: string;
  buildVersion: string;
  buildDate: string;
  buildTime: string;
}

let currentMeta = { ...buildMeta };
const listeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('build-meta:update', ((e: CustomEvent) => {
    currentMeta = { ...e.detail };
    listeners.forEach((fn) => fn());
  }) as EventListener);
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
};

const getSnapshot = () => currentMeta;

export const useAppVersion = (): AppVersionInfo => {
  const meta = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const releaseVersion = getLatestChangelogEntry()?.version || meta.appVersion || 'v0.1.0';
  const buildVersion = meta.buildVersion || releaseVersion;

  return {
    releaseVersion,
    buildVersion,
    buildDate: meta.buildDate,
    buildTime: meta.buildTime || '',
  };
};

/** @deprecated Use useAppVersion() hook instead */
export const getAppVersionInfo = (): AppVersionInfo => {
  const releaseVersion = getLatestChangelogEntry()?.version || currentMeta.appVersion || 'v0.1.0';
  const buildVersion = currentMeta.buildVersion || releaseVersion;
  return {
    releaseVersion,
    buildVersion,
    buildDate: currentMeta.buildDate,
    buildTime: currentMeta.buildTime || '',
  };
};