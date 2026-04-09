import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { adminSessionService } from '../services/sessionService';
import { runtimeConfig } from '../config/runtime';

export interface UserPayload {
  isAdmin: boolean;
  sessionId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.auth_token;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, runtimeConfig.jwtSecret) as UserPayload;
    if (!payload.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (payload.sessionId && adminSessionService.isLockedFor(payload.sessionId)) {
      return res.status(403).json({ error: 'Your admin session was terminated because another administrator signed in.' });
    }

    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
