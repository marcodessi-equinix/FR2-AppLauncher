import axios from 'axios';

const normalizeApiBase = (base: string): string => {
  const trimmed = base.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const runtimeApiUrl = String(window.RUNTIME_CONFIG?.API_URL || '').trim();
const fallbackApiUrl = `${window.location.origin.replace(/\/$/, '')}/api`;

const API_BASE = normalizeApiBase(runtimeApiUrl || fallbackApiUrl);

const isLikelyHtml = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  const sample = value.trim().toLowerCase();
  return sample.startsWith('<!doctype html') || sample.startsWith('<html');
};

const normalizeError = (error: unknown): Error => {
  if (axios.isAxiosError(error)) {
    let errToReturn: Error;
    if (error.response) {
      const status = error.response.status;
      const body = error.response.data;
      if (isLikelyHtml(body)) {
        errToReturn = new Error(`API returned HTML instead of JSON (status ${status}).`);
      } else {
        errToReturn = new Error(`API request failed (status ${status}).`);
      }
      // Attach response to the error so caller can access status and data
      (errToReturn as Error & { response?: unknown }).response = error.response;
      return errToReturn;
    }
    if (error.request) {
      return new Error('API request failed: no response (network/CORS/connection refused).');
    }
    return new Error(error.message || 'API request failed.');
  }
  if (error instanceof Error) return error;
  return new Error('Unknown API error.');
};

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 10000,
});

api.interceptors.response.use(
  (response) => {
    const contentType = String(response.headers?.['content-type'] || '');
    if (!contentType.includes('application/json') || isLikelyHtml(response.data)) {
      throw new Error(`Expected JSON but received '${contentType || 'unknown'}'.`);
    }
    if (response.data === undefined || response.data === null) {
      throw new Error('API returned empty JSON payload.');
    }
    return response;
  },
  (error) => Promise.reject(normalizeError(error))
);

const parseJsonResponse = async <T>(response: Response, label: string): Promise<T> => {
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`${label} failed: ${response.status} ${responseText.slice(0, 200)}`);
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    throw new Error(`${label} failed: expected JSON but got '${contentType || 'unknown'}'.`);
  }

  if (isLikelyHtml(responseText)) {
    throw new Error(`${label} failed: API returned HTML instead of JSON.`);
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    throw new Error(`${label} failed: invalid JSON payload.`);
  }
};

export const safeArray = <T>(value: unknown): T[] => (Array.isArray(value) ? value : []);

export const parseBookmarks = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_BASE}/admin/parse-bookmarks`, {
    method: 'POST',
    body: formData,
  });

  const parsed = await parseJsonResponse<Partial<ImportPreviewData>>(response, 'Parse');
  const groups = safeArray<ParsedGroup>(parsed?.groups);
  const totalLinks =
    typeof parsed?.totalLinks === 'number'
      ? parsed.totalLinks
      : groups.reduce((sum, group) => sum + safeArray<ParsedLink>(group?.links).length, 0);
  return { groups, totalLinks };
};


export interface ParsedLink {
    title: string;
    url: string;
    icon?: string;
    selected?: boolean;
}

export interface ParsedGroup {
    title: string;
    links: ParsedLink[];
    selected?: boolean;
    targetGroup?: string;
}

export interface ImportPreviewData {
  groups: ParsedGroup[];
  totalLinks: number;
}

export const executeImport = async (data: ImportPreviewData, keepExisting: boolean = false) => {
    const response = await fetch(`${API_BASE}/admin/execute-import`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-keep-existing': keepExisting ? 'true' : 'false'
        },
        body: JSON.stringify(data)
    });

    return parseJsonResponse<Record<string, unknown>>(response, 'Import');
}

/** @deprecated Use parseBookmarks + executeImport flow */
export const uploadBookmarks = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_BASE}/admin/import-bookmarks`, {
    method: 'POST',
    body: formData,
    // Native fetch automatically sets Content-Type to multipart/form-data with boundary
  });

  return parseJsonResponse<Record<string, unknown>>(response, 'Upload');
};

export default api;
