import type { ContactForm, ContentEntry, ContentType, FormSubmission, MediaAsset, Page, User } from '../types/cms';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');
const ACCESS_KEY = 'cms_access_token';
const REFRESH_KEY = 'cms_refresh_token';
const USER_KEY = 'cms_user';
const SESSION_KEYS = [ACCESS_KEY, REFRESH_KEY, USER_KEY] as const;

type ApiErrorBody = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  method?: string;
  path?: string;
  timestamp?: string;
  details?: {
    name?: string;
    message?: string;
    stack?: string[];
    cause?: unknown;
    extra?: Record<string, unknown>;
  };
};

function formatValue(value: unknown) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatApiError(error: ApiErrorBody, fallback: string) {
  const message = Array.isArray(error.message) ? error.message.join('\n') : error.message || fallback;
  const lines = [message];
  const meta = [
    error.statusCode ? `Status: ${error.statusCode}` : '',
    error.error ? `Error: ${error.error}` : '',
    error.method && error.path ? `Request: ${error.method} ${error.path}` : '',
    error.timestamp ? `Time: ${error.timestamp}` : '',
  ].filter(Boolean);

  if (meta.length > 0) lines.push('', ...meta);
  if (error.details?.name) lines.push(`Name: ${error.details.name}`);
  if (error.details?.message && error.details.message !== message) lines.push(`Details: ${error.details.message}`);
  if (error.details?.extra) lines.push('Extra:', formatValue(error.details.extra));
  if (error.details?.cause) lines.push('Cause:', formatValue(error.details.cause));
  if (error.details?.stack?.length) lines.push('Stack:', error.details.stack.join('\n'));

  return lines.filter((line) => line !== '').join('\n');
}

function migrateLegacyLocalSession() {
  for (const key of SESSION_KEYS) {
    const value = localStorage.getItem(key);
    if (value && !sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, value);
    }
    localStorage.removeItem(key);
  }
}

migrateLegacyLocalSession();

export function getAccessToken() {
  return sessionStorage.getItem(ACCESS_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  sessionStorage.setItem(ACCESS_KEY, accessToken);
  sessionStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function setCurrentUser(user: User) {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event('cms:user-updated'));
}

export function getCurrentUser(): User | null {
  const raw = sessionStorage.getItem(USER_KEY);
  if (raw) return JSON.parse(raw) as User;
  const token = getAccessToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { sub: number; email: string; role: 'ADMIN' | 'EDITOR' };
    return { id: payload.sub, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

export function clearTokens() {
  for (const key of SESSION_KEYS) {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  }
  window.dispatchEvent(new Event('cms:user-updated'));
}

export function revokeCurrentSession(options: { keepalive?: boolean } = {}) {
  const token = getAccessToken();
  if (!token) return Promise.resolve();

  return fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
    keepalive: options.keepalive,
  }).catch(() => undefined);
}

export function mediaUrl(url: string) {
  if (!url || /^https?:\/\//.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error(`Cannot reach the CMS API at ${API_URL}`);
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    if (response.status === 401 && token && error.message === 'Unauthorized') {
      clearTokens();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    throw new Error(formatApiError(error, response.statusText || 'Request failed'));
  }
  const data = await response.json();
  const method = (options.method ?? 'GET').toUpperCase();
  if (method !== 'GET') {
    window.dispatchEvent(new CustomEvent('cms:stats-changed', { detail: { path, method } }));
  }
  return data;
}

export const api = {
  login: (body: { email: string; password: string; totpCode?: string }) =>
    request<{ accessToken: string; refreshToken: string; user: User } | { requiresTwoFactor: true; email: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  setupTwoFactor: () => request<{ secret: string; qrCode: string; otpauth: string }>('/auth/2fa/setup', { method: 'POST' }),
  verifyTwoFactor: (code: string) =>
    request<{ enabled: true }>('/auth/2fa/verify', { method: 'POST', body: JSON.stringify({ code }) }),
  disableMyTwoFactor: () => request<{ enabled: false }>('/auth/2fa/disable', { method: 'POST' }),
  me: () => request<User>('/auth/me', { method: 'POST' }),
  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),
  statsOverview: () => request<{ models?: number; entries: number; pages: number; media: number; forms?: number; users?: number }>('/stats/overview'),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<{ ok: true }>('/auth/password', { method: 'POST', body: JSON.stringify(body) }),
  contentTypes: () => request<ContentType[]>('/content-types'),
  createContentType: (body: Partial<ContentType>) =>
    request<ContentType>('/content-types', { method: 'POST', body: JSON.stringify(body) }),
  updateContentType: (key: string, body: Partial<ContentType>) =>
    request<ContentType>(`/content-types/${key}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteContentType: (key: string) => request<ContentType>(`/content-types/${key}`, { method: 'DELETE' }),
  entries: (type: string) => request<ContentEntry[]>(`/content/${type}`),
  createEntry: (type: string, body: Partial<ContentEntry>) =>
    request<ContentEntry>(`/content/${type}`, { method: 'POST', body: JSON.stringify(body) }),
  updateEntry: (type: string, id: number, body: Partial<ContentEntry>) =>
    request<ContentEntry>(`/content/${type}/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteEntry: (type: string, id: number) => request<ContentEntry>(`/content/${type}/${id}`, { method: 'DELETE' }),
  pages: () => request<Page[]>('/pages'),
  createPage: (body: Partial<Page>) => request<Page>('/pages', { method: 'POST', body: JSON.stringify(body) }),
  updatePage: (slug: string, body: Partial<Page>) =>
    request<Page>(`/pages/${slug}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletePage: (slug: string) => request<Page>(`/pages/${slug}`, { method: 'DELETE' }),
  users: () => request<User[]>('/users'),
  createUser: (body: { email: string; name?: string; password: string; role: 'ADMIN' | 'EDITOR' }) =>
    request<User>('/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id: number, body: Partial<{ name: string; password: string; role: 'ADMIN' | 'EDITOR' }>) =>
    request<User>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteUser: (id: number) => request<{ id: number }>(`/users/${id}`, { method: 'DELETE' }),
  disableUserTwoFactor: (id: number) => request<User>(`/users/${id}/2fa/disable`, { method: 'POST' }),
  media: () => request<MediaAsset[]>('/media'),
  deleteMedia: (id: number) => request<MediaAsset>(`/media/${id}`, { method: 'DELETE' }),
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<{ url: string }>('/media/upload', { method: 'POST', body: formData });
  },
  forms: () => request<ContactForm[]>('/forms'),
  createForm: (body: Partial<ContactForm>) => request<ContactForm>('/forms', { method: 'POST', body: JSON.stringify(body) }),
  updateForm: (key: string, body: Partial<ContactForm>) =>
    request<ContactForm>(`/forms/${key}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteForm: (key: string) => request<ContactForm>(`/forms/${key}`, { method: 'DELETE' }),
  formSubmissions: (key: string) => request<FormSubmission[]>(`/forms/${key}/submissions`),
  submitForm: (key: string, data: Record<string, unknown>) =>
    request<{ ok: true; submissionId: number; notificationSent: boolean; responseSent: boolean; message: string }>(`/forms/${key}/submit`, {
      method: 'POST',
      body: JSON.stringify({ data }),
    }),
};
