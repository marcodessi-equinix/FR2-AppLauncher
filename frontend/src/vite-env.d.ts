/// <reference types="vite/client" />

declare module 'virtual:build-meta' {
  export const buildMeta: {
    releaseVersion: string;
    gitSha: string;
    buildDate: string;
    buildTime: string;
    buildNumber: string;
  };
}
