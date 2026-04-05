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

const PORT = Number(process.env.PORT) || 3000;

const JWT_SECRET = process.env.JWT_SECRET || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ALLOW_INSECURE_DEFAULTS = process.env.ALLOW_INSECURE_DEFAULTS === 'true';
const NODE_ENV = process.env.NODE_ENV || 'development';
const requiredAllowedOrigins = [
  'https://fr2-applauncher.equinix.com',
  'http://fr2lxcops02.corp.equinix.com:9020',
];
const explicitAllowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const devAllowedOrigins = [
  'http://localhost:9020',
  'http://127.0.0.1:9020',
  'http://localhost:5001',
  'http://127.0.0.1:5001',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5175',
];

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

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

export function createApp(): express.Express {
  const app = express();
  app.set('trust proxy', 1);
  const allowedOrigins = new Set([
    ...requiredAllowedOrigins,
    ...explicitAllowedOrigins,
    ...(NODE_ENV === 'production' ? [] : devAllowedOrigins),
  ].map(normalizeOrigin));
  const corsOptions: cors.CorsOptions = {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      const requestOrigin = normalizeOrigin(origin);
      if (allowedOrigins.has(requestOrigin)) {
        callback(null, origin);
        return;
      }

      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 204,
  };

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        styleSrcElem: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", "https://api.open-meteo.com", "https://api.iconify.design"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: false,
  }));

  app.use(cors(corsOptions));
  app.options(/.*/, cors(corsOptions));
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
    await runMigrations();

    const app = createApp();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`FR2 AppLauncher backend listening on 0.0.0.0:${PORT}`);
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
