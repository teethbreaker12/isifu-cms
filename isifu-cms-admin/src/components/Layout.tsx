import { BookOpen, ClipboardList, Database, FileText, Image, LayoutDashboard, LogOut, Menu, Settings, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearTokens } from '../api/client';
import { isAdmin } from '../auth';
import { getLanguage, setLanguage, t } from '../i18n';
import { useTheme } from '../theme';
import { UserBadge } from './UserBadge';

export function Layout() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const links = [
    { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard, adminOnly: false },
    { to: '/entries', label: t('nav.entries'), icon: BookOpen, adminOnly: false },
    { to: '/forms', label: t('nav.forms'), icon: ClipboardList, adminOnly: false },
    { to: '/content-types', label: t('nav.models'), icon: Database, adminOnly: true },
    { to: '/pages', label: t('nav.pages'), icon: FileText, adminOnly: false },
    { to: '/media', label: t('nav.media'), icon: Image, adminOnly: false },
    { to: '/users', label: t('nav.users'), icon: Users, adminOnly: true },
    { to: '/settings', label: t('nav.settings'), icon: Settings, adminOnly: false },
  ].filter((link) => !link.adminOnly || isAdmin());

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const signOut = () => {
    clearTokens();
    setMobileMenuOpen(false);
    navigate('/login');
  };

  const sidebarContent = (
    <>
      <div className="px-5 py-5 pr-16 md:px-6 md:pr-6">
        <div className="text-lg font-semibold tracking-tight text-stone-950">{t('app.name')}</div>
        <div className="text-sm text-stone-500">{t('app.subtitle')}</div>
      </div>
      <nav className="grid gap-1 px-3">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                isActive ? 'bg-blue-50 text-blue-700' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-950'
              }`
            }
          >
            <Icon size={19} />
            <span className="min-w-0 truncate">{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto grid gap-3 px-3 pb-4 pt-6">
        <UserBadge compact />
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
        <button
          className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm text-stone-600 hover:bg-stone-100"
          onClick={signOut}
        >
          <LogOut size={18} />
          {t('nav.signOut')}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#f7f7f4]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-stone-200 bg-white md:flex">
        {sidebarContent}
      </aside>

      <div className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-stone-200 bg-white px-4 md:hidden">
        <div className="min-w-0">
          <div className="truncate text-base font-semibold tracking-tight text-stone-950">{t('app.name')}</div>
          <div className="truncate text-xs text-stone-500">{t('app.subtitle')}</div>
        </div>
        <button
          type="button"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-stone-300 text-stone-700"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open navigation"
          aria-expanded={mobileMenuOpen}
        >
          <Menu size={22} />
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 h-full w-full bg-stone-950/40"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(20rem,86vw)] flex-col overflow-y-auto border-r border-stone-200 bg-white shadow-xl">
            <button
              type="button"
              className="absolute right-3 top-4 z-10 grid h-10 w-10 place-items-center rounded-md border border-stone-300 bg-white text-stone-700"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation"
            >
              <X size={20} />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      <main className="min-w-0 md:pl-64">
        <div className="mx-auto min-w-0 max-w-7xl px-3 py-4 sm:px-5 md:py-6 lg:px-6 xl:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
