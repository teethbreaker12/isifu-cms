import { UserCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCurrentUser } from '../api/client';
import { t } from '../i18n';

export function UserBadge({ compact = false }: { compact?: boolean }) {
  const [user, setUser] = useState(getCurrentUser());

  useEffect(() => {
    const refresh = () => setUser(getCurrentUser());
    window.addEventListener('cms:user-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('cms:user-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  if (!user) return null;
  const displayName = user.name && user.name !== user.email ? user.name : t('user.noName');

  return (
    <div className={`rounded-md border border-stone-200 bg-stone-50 ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-blue-600 text-white">
          <UserCircle size={19} />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-stone-500">{t('user.loggedInAs')}</div>
          <div className="truncate text-sm font-semibold text-stone-950">{displayName}</div>
          <div className="truncate text-xs text-stone-500">{user.email}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-stone-700">{user.role}</span>
            {typeof user.twoFactorEnabled === 'boolean' && (
              <span className={`rounded-md px-2 py-1 text-xs font-semibold ${user.twoFactorEnabled ? 'bg-blue-50 text-blue-700' : 'bg-stone-100 text-stone-600'}`}>
                {user.twoFactorEnabled ? t('users.twoFactorEnabled') : t('users.twoFactorDisabled')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
