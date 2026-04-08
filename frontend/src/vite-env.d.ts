/// <reference types="vite/client" />

declare module 'virtual:build-meta' {
  export const buildMeta: {
    appVersion: string;
    buildVersion: string;
    buildDate: string;
    buildTime: string;
  };
}
