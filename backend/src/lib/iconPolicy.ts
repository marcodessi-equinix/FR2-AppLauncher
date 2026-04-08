import path from 'path';

const ICON_NAME_PATTERN = /^(?:[a-z0-9]+:)?[a-z0-9][a-z0-9._-]{0,127}$/i;
const UPLOAD_ICON_PREFIX = '/uploads/icons/';

export const allowedImageExtensions = new Set([
  '.apng',
  '.avif',
  '.bmp',
  '.dib',
  '.gif',
  '.heic',
  '.heif',
  '.ico',
  '.jfif',
  '.jpeg',
  '.jpg',
  '.pjp',
  '.pjpeg',
  '.png',
  '.svg',
  '.svgz',
  '.tif',
  '.tiff',
  '.webp',
]);

const hasValidUploadedIconPath = (icon: string): boolean => {
  if (!icon.startsWith(UPLOAD_ICON_PREFIX)) {
    return false;
  }

  const filename = icon.slice(UPLOAD_ICON_PREFIX.length);
  if (!filename || filename !== path.basename(filename)) {
    return false;
  }

  return allowedImageExtensions.has(path.extname(filename).toLowerCase());
};

export function isAllowedIconValue(icon: string): boolean {
  const normalized = icon.trim();

  if (!normalized) {
    return true;
  }

  if (hasValidUploadedIconPath(normalized)) {
    return true;
  }

  return ICON_NAME_PATTERN.test(normalized);
}

export function normalizeStoredIconValue(icon?: string | null): string {
  const normalized = typeof icon === 'string' ? icon.trim() : '';
  return isAllowedIconValue(normalized) ? normalized : '';
}
