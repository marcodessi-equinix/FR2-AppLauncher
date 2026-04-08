import type { NextFunction, Request, Response } from 'express';
import { isAllowedRequestOrigin } from '../lib/originPolicy';

const NODE_ENV = process.env.NODE_ENV || 'development';

export const requireTrustedOrigin = (req: Request, res: Response, next: NextFunction) => {
  if (isAllowedRequestOrigin(req, NODE_ENV)) {
    next();
    return;
  }

  res.status(403).json({ error: 'Cross-site request blocked' });
};
