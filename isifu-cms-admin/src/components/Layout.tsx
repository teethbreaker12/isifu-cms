import { BookOpen, Database, FileText, Image, LayoutDashboard, LogOut, Settings, Users } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearTokens } from '../api/client';
import { isAdmin } from '../auth';
import { getLanguage, setLanguage, t } from '../i18n';
import { useTheme } from '../theme';
import { UserBadge } from './UserBadge';

export function Layout() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const links = [
    { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard, adminOnly: false },
    { to: '/entries', label: t('nav.entries'), icon: BookOpen, adminOnly: false },
    { to: '/content-types', label: t('nav.models'), icon: Database, adminOnly: true },
    { to: '/pages', label: t('nav.pages'), icon: FileText, adminOnly: false },
    { to: '/media', label: t('nav.media'), icon: Image, adminOnly: false },
    { to: '/users', label: t('nav.users'), icon: Users, adminOnly: true },
    { to: '/settings', label: t('nav.settings'), icon: Settings, adminOnly: false },
  ].filter((link) => !link.adminOnly || isAdmin());

  return (
    <div className="min-h-screen bg-[#f7f7f4]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-stone-200 bg-white md:block">
        <div className="px-6 py-5">
          <div className="text-lg font-semibold tracking-tight text-stone-950">{t('app.name')}</div>
          <div className="text-sm text-stone-500">{t('app.subtitle')}</div>
        </div>
        <nav className="space-y-1 px-3 pb-64">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-950'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-40 left-3 right-3">
          <UserBadge compact />
        </div>
        <div className="absolute bottom-28 left-3 right-3">
          <select
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-700"
            value={getLanguage()}
            onChange={(event) => setLanguage(event.target.value)}
            aria-label="Language"
          >
            <option value="en">English</option>
            <option value="pl">Polski</option>
            <option value="es">Español</option>
          </select>
        </div>
        <div className="absolute bottom-16 left-3 right-3">
          <select
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-700"
            value={theme}
            onChange={(event) => setTheme(event.target.value as 'light' | 'dark' | 'system')}
            aria-label="Theme"
          >
            <option value="system">{t('theme.system')}</option>
            <option value="light">{t('theme.light')}</option>
            <option value="dark">{t('theme.dark')}</option>
          </select>
        </div>
        <button
          className="absolute bottom-4 left-3 right-3 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-stone-600 hover:bg-stone-100"
          onClick={() => {
            clearTokens();
            navigate('/login');
          }}
        >
          <LogOut size={18} />
          {t('nav.signOut')}
        </button>
      </aside>
      <main className="md:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
