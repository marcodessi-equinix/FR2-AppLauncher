import path from 'path';

export type CookieSecureMode = 'auto' | 'true' | 'false';

const backendRoot = path.resolve(__dirname, '../..');

const normalizeCookieSecureMode = (value: string | undefined): CookieSecureMode => {
  const normalized = (value || 'auto').trim().toLowerCase();
  if (normalized === 'true' || normalized === 'false') {
    return normalized;
  }

  return 'auto';
};

const resolvePathFromCwd = (value: string): string => path.resolve(process.cwd(), value);

export const runtimeConfig = {
  backendRoot,
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  allowInsecureDefaults: process.env.ALLOW_INSECURE_DEFAULTS === 'true',
  cookieSecureMode: normalizeCookieSecureMode(process.env.COOKIE_SECURE),
  rawCookieSecureMode: (process.env.COOKIE_SECURE || 'auto').trim().toLowerCase(),
  frontendUrl: process.env.FRONTEND_URL || '',
  databasePath: process.env.DATABASE_PATH
    ? resolvePathFromCwd(process.env.DATABASE_PATH)
    : path.join(backendRoot, 'data', 'applauncher.db'),
  uploadIconsDir: process.env.UPLOAD_PATH
    ? resolvePathFromCwd(process.env.UPLOAD_PATH)
    : path.join(backendRoot, 'uploads', 'icons'),
};

export const uploadsRootDir = path.dirname(runtimeConfig.uploadIconsDir);
