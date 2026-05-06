import type { ContactForm, ContentEntry, ContentType, FormSubmission, MediaAsset, Page, User } from '../types/cms';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');
const ACCESS_KEY = 'cms_access_token';
const REFRESH_KEY = 'cms_refresh_token';
const USER_KEY = 'cms_user';

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function setCurrentUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event('cms:user-updated'));
}

export function getCurrentUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
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
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
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
    throw new Error(error.message || 'Request failed');
  }
  return response.json();
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
