import type express from 'express';
import { runtimeConfig } from '../config/runtime';

const explicitAllowedOrigins = runtimeConfig.frontendUrl
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const devAllowedOrigins = [
  'http://localhost:9020',
  'http://127.0.0.1:9020',
  'http://localhost:5001',
  'http://127.0.0.1:5001',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5175',
];

export function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

export function getConfiguredOrigins(): string[] {
  return explicitAllowedOrigins.map(normalizeOrigin);
}

export function getForwardedValue(value: string | string[] | undefined): string | null {
  if (!value) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = raw.split(',')[0].trim();
  return normalized || null;
}

export function getInferredOrigins(req: express.Request): string[] {
  const host = getForwardedValue(req.headers['x-forwarded-host']) || getForwardedValue(req.headers.host);
  if (!host) return [];

  const proto = getForwardedValue(req.headers['x-forwarded-proto']);
  if (proto) {
    return [`${proto}://${host}`];
  }

  return [`http://${host}`, `https://${host}`];
}

export function getAllowedOrigins(req: express.Request, nodeEnv: string): Set<string> {
  return new Set([
    ...getConfiguredOrigins(),
    ...getInferredOrigins(req).map(normalizeOrigin),
    ...(nodeEnv === 'production' ? [] : devAllowedOrigins.map(normalizeOrigin)),
  ]);
}

export function extractRequestSourceOrigin(req: express.Request): string | null {
  const originHeader = normalizeOrigin(req.header('Origin') || '');
  if (originHeader) {
    return originHeader;
  }

  const referer = req.header('Referer') || '';
  if (!referer) {
    return null;
  }

  try {
    return normalizeOrigin(new URL(referer).origin);
  } catch {
    return null;
  }
}

export function isAllowedRequestOrigin(req: express.Request, nodeEnv: string): boolean {
  const requestOrigin = extractRequestSourceOrigin(req);
  if (!requestOrigin) {
    return false;
  }

  return getAllowedOrigins(req, nodeEnv).has(requestOrigin);
}
