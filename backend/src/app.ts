import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
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

const PORT = Number(process.env.PORT) || 3000;

const JWT_SECRET = process.env.JWT_SECRET || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ALLOW_INSECURE_DEFAULTS = process.env.ALLOW_INSECURE_DEFAULTS === 'true';
const NODE_ENV = process.env.NODE_ENV || 'development';
const COOKIE_SECURE_MODE = (process.env.COOKIE_SECURE || 'auto').trim().toLowerCase();
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
  if (!ALLOW_INSECURE_DEFAULTS && (isWeakSecret(JWT_SECRET) || isWeakAdminPassword(ADMIN_PASSWORD))) {
    console.error('Refusing to start with insecure credentials. Set strong JWT_SECRET and ADMIN_PASSWORD.');
    process.exit(1);
  }
}

function warnOnSuspiciousConfig(): void {
  if (!['', 'auto', 'true', 'false'].includes(COOKIE_SECURE_MODE)) {
    console.warn(`Unsupported COOKIE_SECURE value '${process.env.COOKIE_SECURE}'. Expected auto, true, or false. Falling back to automatic proxy detection.`);
  }

  for (const origin of getConfiguredOrigins()) {
    const normalizedOrigin = normalizeOrigin(origin).toLowerCase();
    if (COOKIE_SECURE_MODE === 'true' && normalizedOrigin.startsWith('http://')) {
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

    const allowedOrigins = getAllowedOrigins(req, NODE_ENV);

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
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return app;
}

export const startServer = async () => {
  try {
    assertSecureConfig();
    warnOnSuspiciousConfig();
    await runMigrations();

    const app = createApp();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`AppLauncher backend listening on 0.0.0.0:${PORT}`);
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
