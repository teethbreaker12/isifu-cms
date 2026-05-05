import { getCurrentUser } from './api/client';

export function currentRole() {
  return getCurrentUser()?.role ?? null;
}

export function isAdmin() {
  return currentRole() === 'ADMIN';
}
