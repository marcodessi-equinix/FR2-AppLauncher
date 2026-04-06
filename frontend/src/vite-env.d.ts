/// <reference types="vite/client" />

interface RuntimeConfig {
  API_URL?: string;
}

interface Window {
  RUNTIME_CONFIG?: RuntimeConfig;
}

declare const __APP_VERSION__: string;
declare const __APP_BUILD_VERSION__: string;
declare const __BUILD_DATE__: string;
