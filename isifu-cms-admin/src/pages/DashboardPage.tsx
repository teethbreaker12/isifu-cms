import { BookOpen, ClipboardList, Database, FileText, Image, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { isAdmin } from '../auth';
import { Panel } from '../components/Panel';
import { UserBadge } from '../components/UserBadge';
import { t } from '../i18n';

type Stat = {
  label: string;
  value: number | string;
  icon: typeof Database;
};

export function DashboardPage() {
  const admin = isAdmin();
  const [stats, setStats] = useState<Stat[]>([]);

  useEffect(() => {
    async function load() {
      const overview: { models?: number; entries: number; pages: number; media: number; forms?: number; users?: number } =
        await api.statsOverview().catch(() => ({ entries: 0, pages: 0, media: 0, forms: 0 }));
      const baseStats: Stat[] = [
        { label: t('dashboard.statEntries'), value: overview.entries, icon: BookOpen },
        { label: t('dashboard.statPages'), value: overview.pages, icon: FileText },
        { label: t('dashboard.statForms'), value: overview.forms ?? 0, icon: ClipboardList },
        { label: t('dashboard.statMedia'), value: overview.media, icon: Image },
      ];

      if (admin) {
        baseStats.unshift(
          { label: t('dashboard.statModels'), value: overview.models ?? 0, icon: Database },
        );
        baseStats.push(
          { label: t('dashboard.statUsers'), value: overview.users ?? 0, icon: Users },
        );
      }

      setStats(baseStats);
    }

    void load();
  }, [admin]);

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold text-stone-950">{t('dashboard.title')}</h1>
        <p className="text-sm text-stone-500">{t('dashboard.subtitle')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-medium text-stone-500">{label}</div>
              <div className="grid h-9 w-9 place-items-center rounded-md bg-blue-50 text-blue-700">
                <Icon size={18} />
              </div>
            </div>
            <div className="text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={t('user.session')}>
          <UserBadge />
        </Panel>
        <Panel title={admin ? t('dashboard.adminMode') : t('dashboard.editorMode')}>
          <p className="text-sm leading-6 text-stone-600">{admin ? t('dashboard.adminModeText') : t('dashboard.editorModeText')}</p>
        </Panel>
        <Panel title={t('dashboard.apiCard')}>
          <p className="text-sm leading-6 text-stone-600">{t('dashboard.cardText')}</p>
        </Panel>
      </div>
    </div>
  );
}
