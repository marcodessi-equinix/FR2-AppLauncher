import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { adminSessionService } from '../services/sessionService';
import { requireTrustedOrigin } from '../middleware/trustedOrigin';
import { runtimeConfig } from '../config/runtime';

const router = express.Router();

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 10;
const loginAttempts = new Map<string, { count: number; firstAttemptAt: number }>();
const LoginSchema = z.object({
  password: z.string().min(1),
  overrideLock: z.boolean().optional().default(false),
});
const TokenPayloadSchema = z.object({
  isAdmin: z.boolean(),
  sessionId: z.string().uuid().optional(),
});

function isHttpsRequest(req: express.Request): boolean {
  const forwardedProto = req.header('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  return req.secure || forwardedProto === 'https';
}

function getAuthCookieBaseOptions(req: express.Request): express.CookieOptions {
  const secure = runtimeConfig.cookieSecureMode === 'false'
    ? false
    : isHttpsRequest(req);

  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
  };
}

function getAuthCookieOptions(req: express.Request): express.CookieOptions {
  return {
    ...getAuthCookieBaseOptions(req),
    maxAge: COOKIE_MAX_AGE_MS,
  };
}

function getClientKey(req: express.Request): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.ip || 'unknown';
}

function isRateLimited(req: express.Request): boolean {
  const key = getClientKey(req);
  const now = Date.now();
  const current = loginAttempts.get(key);

  if (!current) {
    loginAttempts.set(key, { count: 1, firstAttemptAt: now });
    return false;
  }

  if (now - current.firstAttemptAt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAttemptAt: now });
    return false;
  }

  current.count += 1;
  loginAttempts.set(key, current);
  return current.count > MAX_LOGIN_ATTEMPTS;
}

function clearRateLimit(req: express.Request) {
  loginAttempts.delete(getClientKey(req));
}

async function verifyAdminPassword(password: string): Promise<boolean> {
  if (!runtimeConfig.adminPassword) {
    return false;
  }

  if (runtimeConfig.adminPassword.startsWith('$2')) {
    return bcrypt.compare(password, runtimeConfig.adminPassword);
  }

  return password === runtimeConfig.adminPassword;
}

function getTokenPayload(token: string) {
  const verifiedToken = jwt.verify(token, runtimeConfig.jwtSecret);
  return TokenPayloadSchema.parse(verifiedToken);
}

router.post('/login', async (req, res) => {
  if (isRateLimited(req)) {
    return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
  }

  const parsedBody = LoginSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ error: 'Invalid login payload' });
  }

  const { password, overrideLock } = parsedBody.data;

  if (!await verifyAdminPassword(password)) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const sessionId = uuidv4();
  if (!adminSessionService.claimSession(sessionId, overrideLock)) {
    return res.status(403).json({ error: 'Another staff member is currently logged in. Please wait until they are finished before making changes.' });
  }

  const token = jwt.sign({ isAdmin: true, sessionId }, runtimeConfig.jwtSecret, { expiresIn: '7d' });
  clearRateLimit(req);

  res.cookie('auth_token', token, getAuthCookieOptions(req));

  return res.json({ success: true, sessionId });
});

router.post('/logout', requireTrustedOrigin, (req, res) => {
  const token = req.cookies.auth_token;
  if (token) {
    try {
      const payload = getTokenPayload(token);
      adminSessionService.clearSession(payload.sessionId);
    } catch(e) {}
  }
  res.clearCookie('auth_token', getAuthCookieBaseOptions(req));
  res.json({ success: true });
});

router.post('/heartbeat', requireTrustedOrigin, (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const payload = getTokenPayload(token);
    if (!payload.sessionId || !adminSessionService.heartbeat(payload.sessionId)) {
        return res.status(403).json({ error: 'Session overwritten by another admin' });
    }
    return res.json({ success: true });
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

router.get('/me', (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) {
    return res.json({ isAdmin: false });
  }
  try {
    const payload = getTokenPayload(token);
    
    // Check if session has been locked by someone else
    if (!payload.sessionId || !adminSessionService.heartbeat(payload.sessionId)) {
        res.clearCookie('auth_token', getAuthCookieBaseOptions(req));
        return res.json({ isAdmin: false });
    }

    return res.json({ isAdmin: true });
  } catch (e) {
    return res.json({ isAdmin: false });
  }
});

export default router;
