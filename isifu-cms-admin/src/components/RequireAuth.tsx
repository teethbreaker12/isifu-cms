import { Navigate, Outlet, useLocation } from 'react-router';
import { useEffect } from 'react';
import { api, getAccessToken, setCurrentUser } from '../api/client';
import { isAdmin } from '../auth';

export function RequireAuth() {
  const location = useLocation();
  useEffect(() => {
    if (getAccessToken()) {
      api.me().then(setCurrentUser).catch(() => undefined);
    }
  }, []);

  if (!getAccessToken()) return <Navigate to="/login" replace />;
  const adminOnlyPaths = ['/content-types', '/users'];
  if (!isAdmin() && adminOnlyPaths.some((path) => location.pathname.startsWith(path))) {
    return <Navigate to="/entries" replace />;
  }
  return <Outlet />;
}
