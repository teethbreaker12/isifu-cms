import { BookOpen, ClipboardList, Database, FileText, Image, ShieldCheck, Users } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { isAdmin } from '../auth';
import { Panel } from '../components/Panel';
import { useToast } from '../components/Toast';
import { UserBadge } from '../components/UserBadge';
import { t } from '../i18n';

type Stat = {
  label: string;
  value: number;
  icon: typeof Database;
};

function CountValue({ value }: { value: number }) {
  const previousValue = useRef(value);
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const duration = 520;
    const start = performance.now();
    const from = previousValue.current;
    const distance = value - from;
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(from + distance * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        previousValue.current = value;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <span>{displayValue.toLocaleString()}</span>;
}

export function DashboardPage() {
  const { notify } = useToast();
  const admin = isAdmin();
  const [stats, setStats] = useState<Stat[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (showLoader = false) => {
    if (showLoader) {
      setLoaded(false);
    }
    try {
      const overview = await api.statsOverview();
      const baseStats: Stat[] = [
        { label: t('dashboard.statEntries'), value: overview.entries ?? 0, icon: BookOpen },
        { label: t('dashboard.statPages'), value: overview.pages ?? 0, icon: FileText },
        { label: t('dashboard.statMedia'), value: overview.media ?? 0, icon: Image },
      ];

      if (typeof overview.forms === 'number') {
        baseStats.splice(2, 0, { label: t('dashboard.statForms'), value: overview.forms, icon: ClipboardList });
      }

      if (admin) {
        baseStats.unshift(
          { label: t('dashboard.statModels'), value: overview.models ?? 0, icon: Database },
        );
        baseStats.push(
          { label: t('dashboard.statUsers'), value: overview.users ?? 0, icon: Users },
        );
      }

      setStats(baseStats);
      setError('');
      setLoaded(true);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : t('dashboard.statsError');
      setError(message);
      setLoaded(true);
      notify(message, 'error');
    }
  }, [admin, notify]);

  useEffect(() => {
    void load(true);
  }, [load]);

  useEffect(() => {
    const refresh = () => void load(false);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    window.addEventListener('focus', refresh);
    window.addEventListener('cms:stats-changed', refresh);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('cms:stats-changed', refresh);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [load]);

  const total = stats.reduce((sum, stat) => sum + stat.value, 0);
  const max = Math.max(...stats.map((stat) => stat.value), 1);
  const hasContent = total > 0;

  return (
    <div className="grid gap-5">
      <div className="quiet-reveal border-b border-stone-200 pb-5">
        <div className="min-w-0">
          <h1 className="page-title">{t('dashboard.title')}</h1>
          <p className="page-subtitle mt-1">{t('dashboard.subtitle')}</p>
        </div>
      </div>

      <section className="quiet-reveal app-panel overflow-hidden rounded-lg" style={{ animationDelay: '70ms' }}>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/80 px-4 py-3 sm:px-5">
          <div>
            <h2 className="panel-title">{t('dashboard.contentLoad')}</h2>
          </div>
          <div className="metric-value rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-semibold text-stone-700">
            {t('dashboard.totalRecords')}: {total.toLocaleString()}
          </div>
        </header>
        {error && (
          <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 sm:px-5">
            {error}
          </div>
        )}

        <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid min-w-0 divide-y divide-stone-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-3">
            {!loaded
              ? Array.from({ length: admin ? 6 : 4 }).map((_, index) => (
                <div key={index} className="min-h-32 p-4 sm:p-5">
                  <div className="h-4 w-24 animate-pulse rounded bg-stone-200" />
                  <div className="mt-7 h-9 w-16 animate-pulse rounded bg-stone-200" />
                  <div className="mt-5 h-1.5 w-full animate-pulse rounded bg-stone-200" />
                </div>
              ))
              : stats.map(({ label, value, icon: Icon }) => (
                <div key={label} className="group min-h-32 p-4 transition hover:bg-stone-50 sm:p-5">
                  <div className="mb-6 flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-stone-500">{label}</div>
                    <div className="accent-soft grid h-8 w-8 place-items-center rounded-md border bg-white">
                      <Icon size={17} />
                    </div>
                  </div>
                  <div className="metric-value text-3xl font-semibold tracking-tight text-stone-950">
                    <CountValue value={value} />
                  </div>
                  <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{ width: `${Math.max((value / max) * 100, value ? 10 : 0)}%`, background: 'var(--app-accent)' }}
                    />
                  </div>
                </div>
              ))}
          </div>

          <aside className="border-t border-stone-200 bg-stone-50/70 p-4 sm:p-5 lg:border-l lg:border-t-0">
            <div className="app-label">{t('dashboard.inventory')}</div>
            <div className="mt-5 grid gap-3">
              {(loaded ? stats : []).map(({ label, value }) => (
                <div key={label} className="grid grid-cols-[6rem_minmax(0,1fr)_3rem] items-center gap-3 text-xs">
                  <span className="truncate font-medium text-stone-600">{label}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-stone-200">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${Math.max((value / max) * 100, value ? 10 : 0)}%`, background: 'var(--app-accent)' }}
                    />
                  </span>
                  <span className="metric-value text-right font-semibold text-stone-950">{value}</span>
                </div>
              ))}
              {loaded && !hasContent && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                  {t('dashboard.needsSetup')}
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={t('dashboard.sessionAccess')}>
          <UserBadge />
        </Panel>
        <Panel title={t('dashboard.pipeline')}>
          <div className="grid gap-3">
            <div className="flex items-center justify-between rounded-md border border-stone-200 bg-stone-50 px-3 py-2">
              <span className="text-sm font-medium text-stone-600">{admin ? t('dashboard.adminMode') : t('dashboard.editorMode')}</span>
              <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-stone-700">{t('dashboard.ready')}</span>
            </div>
            <p className="text-sm leading-6 text-stone-600">{admin ? t('dashboard.adminModeText') : t('dashboard.editorModeText')}</p>
          </div>
        </Panel>
        <Panel title={t('dashboard.operationalNotes')}>
          <div className="grid gap-3 text-sm text-stone-600">
            <div className="flex items-start gap-3">
              <ShieldCheck className="accent-text mt-0.5" size={17} />
              <p className="leading-6">{t('dashboard.cardText')}</p>
            </div>
            <div className="flex items-center justify-between border-t border-stone-200 pt-3 text-xs">
              <span className="font-semibold text-stone-500">{t('dashboard.security')}</span>
              <span className="metric-value font-semibold text-stone-950">JWT / TOTP</span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
