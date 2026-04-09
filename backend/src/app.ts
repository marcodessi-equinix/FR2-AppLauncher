import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { runMigrations } from './db/index';
import authRoutes from './routes/auth';
import groupRoutes from './routes/groups';
import linkRoutes from './routes/links';
import widgetRoutes from './routes/widgets';
import systemRoutes from './routes/system';
import dashboardRoutes from './routes/dashboard';
import uploadRoutes from './routes/upload';
import reorderRoutes from './routes/reorder';
import adminRoutes from './routes/admin';
import favoriteRoutes from './routes/favorites';
import clientRoutes from './routes/clients';
import { getAllowedOrigins, getConfiguredOrigins, normalizeOrigin } from './lib/originPolicy';
import { runtimeConfig, uploadsRootDir } from './config/runtime';
import { getBuildInfo } from './config/buildInfo';

function isWeakSecret(secret: string): boolean {
  const blocked = new Set([
    '',
    'CHANGE_ME_DEV_SECRET',
    'replace-with-long-random-secret',
  ]);
  return blocked.has(secret) || secret.length < 32;
}

function isWeakAdminPassword(password: string): boolean {
  const blocked = new Set(['', 'admin', 'change-me']);
  return blocked.has(password) || password.length < 8;
}

function assertSecureConfig(): void {
  if (
    !runtimeConfig.allowInsecureDefaults
    && (isWeakSecret(runtimeConfig.jwtSecret) || isWeakAdminPassword(runtimeConfig.adminPassword))
  ) {
    console.error('Refusing to start with insecure credentials. Set strong JWT_SECRET and ADMIN_PASSWORD.');
    process.exit(1);
  }
}

function warnOnSuspiciousConfig(): void {
  if (!['', 'auto', 'true', 'false'].includes(runtimeConfig.rawCookieSecureMode)) {
    console.warn(`Unsupported COOKIE_SECURE value '${process.env.COOKIE_SECURE}'. Expected auto, true, or false. Falling back to automatic proxy detection.`);
  }

  for (const origin of getConfiguredOrigins()) {
    const normalizedOrigin = normalizeOrigin(origin).toLowerCase();
    if (runtimeConfig.cookieSecureMode === 'true' && normalizedOrigin.startsWith('http://')) {
      console.warn(`COOKIE_SECURE=true conflicts with non-HTTPS FRONTEND_URL '${origin}'. Cookies will follow the actual proxy/request protocol instead.`);
    }
  }
}

export function createApp(): express.Express {
  const app = express();
  app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
  }));

  app.use(cors((req, callback) => {
    const requestOrigin = normalizeOrigin(req.header('Origin') || '');
    if (!requestOrigin) {
      callback(null, { origin: true, credentials: true });
      return;
    }

    const allowedOrigins = getAllowedOrigins(req, runtimeConfig.nodeEnv);

    if (allowedOrigins.has(requestOrigin)) {
      callback(null, { origin: requestOrigin, credentials: true });
      return;
    }

    callback(null, { origin: false });
  }));
  app.use(morgan('dev'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(cookieParser());
  app.use('/uploads', express.static(uploadsRootDir));

  app.use('/api/auth', authRoutes);
  app.use('/api/groups', groupRoutes);
  app.use('/api/links', linkRoutes);
  app.use('/api/widgets', widgetRoutes);
  app.use('/api/system', systemRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/reorder', reorderRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/favorites', favoriteRoutes);
  app.use('/api/clients', clientRoutes);

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: getBuildInfo().releaseVersion,
    });
  });

  return app;
}

export const startServer = async () => {
  try {
    assertSecureConfig();
    warnOnSuspiciousConfig();
    await runMigrations();

    const app = createApp();
    app.listen(runtimeConfig.port, '0.0.0.0', () => {
      console.log(`AppLauncher backend listening on 0.0.0.0:${runtimeConfig.port}`);
    });
  } catch (error) {
    console.error("Critical failure during startup (Migrations):", error);
    process.exit(1);
  }
};

if (require.main === module) {
  void startServer();
}

export default createApp;
