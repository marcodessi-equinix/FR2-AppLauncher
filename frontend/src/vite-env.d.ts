/// <reference types="vite/client" />

interface Window {
  RUNTIME_CONFIG?: {
    API_URL?: string;
    BUILD_VERSION?: string;
    BUILD_DATE?: string;
    GIT_SHA?: string;
    BUILD_TIME?: string;
    BUILD_NUMBER?: string;
  };
}
