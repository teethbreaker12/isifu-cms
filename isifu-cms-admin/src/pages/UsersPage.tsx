import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldOff, Trash2, UserPlus } from 'lucide-react';
import { api, setCurrentUser } from '../api/client';
import { Panel } from '../components/Panel';
import { t } from '../i18n';
import type { Role, User } from '../types/cms';

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('EDITOR');
  const [error, setError] = useState('');
  const [setup, setSetup] = useState<{ secret: string; qrCode: string; otpauth: string } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [passwords, setPasswords] = useState<Record<number, string>>({});

  const load = () => api.users().then(setUsers).catch(() => setUsers([]));

  useEffect(() => {
    void load();
  }, []);

  async function createUser(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await api.createUser({ email, name: name || undefined, password, role });
      setEmail('');
      setName('');
      setPassword('');
      setRole('EDITOR');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create user');
    }
  }

  async function remove(user: User) {
    if (!window.confirm(`${t('common.delete')} ${user.email}?`)) return;
    await api.deleteUser(user.id);
    await load();
  }

  async function disableUser2fa(user: User) {
    await api.disableUserTwoFactor(user.id);
    await load();
  }

  async function resetPassword(user: User) {
    const password = passwords[user.id];
    if (!password || password.length < 8) return;
    await api.updateUser(user.id, { password });
    setPasswords((current) => ({ ...current, [user.id]: '' }));
    await load();
  }

  async function setupMy2fa() {
    setError('');
    try {
      setSetup(await api.setupTwoFactor());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not start 2FA setup');
    }
  }

  async function verifyMy2fa(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await api.verifyTwoFactor(totpCode);
      setTotpCode('');
      setSetup(null);
      setCurrentUser(await api.me());
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Invalid two-factor code');
    }
  }

  async function disableMy2fa() {
    await api.disableMyTwoFactor();
    setSetup(null);
    setTotpCode('');
    setCurrentUser(await api.me());
    await load();
  }

  return (
    <div className="grid gap-5">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-950">{t('users.title')}</h1>
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Panel title={t('users.create')}>
          <form className="grid gap-4" onSubmit={createUser}>
            <div className="grid gap-3 md:grid-cols-2">
              <input className="rounded-md border border-stone-300 px-3 py-2" placeholder={t('users.name')} value={name} onChange={(event) => setName(event.target.value)} />
              <input className="rounded-md border border-stone-300 px-3 py-2" placeholder={t('users.email')} required value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_160px]">
              <input className="rounded-md border border-stone-300 px-3 py-2" placeholder={t('users.password')} required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              <select className="rounded-md border border-stone-300 px-3 py-2" value={role} onChange={(event) => setRole(event.target.value as Role)}>
                <option value="EDITOR">{t('users.editor')}</option>
                <option value="ADMIN">{t('users.admin')}</option>
              </select>
            </div>
            {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <button className="inline-flex w-fit items-center gap-2 rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white">
              <UserPlus size={16} />
              {t('common.create')}
            </button>
          </form>
        </Panel>

        <Panel title={t('users.twoFactor')}>
          <div className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              <button type="button" className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm font-medium" onClick={setupMy2fa}>
                <ShieldCheck size={16} />
                {t('users.setupMy2fa')}
              </button>
              <button type="button" className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50" onClick={disableMy2fa}>
                <ShieldOff size={16} />
                {t('users.disableMy2fa')}
              </button>
            </div>
            {setup && (
              <form className="grid gap-3" onSubmit={verifyMy2fa}>
                <p className="text-sm leading-6 text-stone-600">{t('users.scanQr')}</p>
                <img src={setup.qrCode} alt="2FA QR code" className="h-44 w-44 rounded-md border border-stone-200 bg-white p-2" />
                <div className="rounded-md bg-stone-100 px-3 py-2 font-mono text-xs text-stone-700">{setup.secret}</div>
                <div className="flex gap-2">
                  <input className="w-40 rounded-md border border-stone-300 px-3 py-2" placeholder="123456" inputMode="numeric" autoComplete="one-time-code" value={totpCode} onChange={(event) => setTotpCode(event.target.value)} />
                  <button className="rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white">{t('users.verify2fa')}</button>
                </div>
              </form>
            )}
          </div>
        </Panel>
      </div>

      <Panel title={t('users.team')}>
        <div className="grid gap-3">
          {users.map((user) => (
            <div key={user.id} className="flex flex-col gap-3 rounded-md border border-stone-200 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-semibold text-stone-950">{user.name || user.email}</div>
                <div className="text-sm text-stone-500">{user.email}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-700">{user.role}</span>
                <span className={`rounded-md px-2 py-1 text-xs font-semibold ${user.twoFactorEnabled ? 'bg-blue-50 text-blue-700' : 'bg-stone-100 text-stone-600'}`}>
                  {user.twoFactorEnabled ? t('users.twoFactorEnabled') : t('users.twoFactorDisabled')}
                </span>
                {user.twoFactorEnabled && (
                  <button className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm" onClick={() => disableUser2fa(user)}>
                    <ShieldOff size={16} />
                    {t('users.disable2fa')}
                  </button>
                )}
                <input
                  className="w-44 rounded-md border border-stone-300 px-3 py-2 text-sm"
                  type="password"
                  placeholder={t('users.newPassword')}
                  value={passwords[user.id] ?? ''}
                  onChange={(event) => setPasswords((current) => ({ ...current, [user.id]: event.target.value }))}
                />
                <button className="rounded-md border border-stone-300 px-3 py-2 text-sm" onClick={() => resetPassword(user)}>
                  {t('users.resetPassword')}
                </button>
                <button className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50" onClick={() => remove(user)}>
                  <Trash2 size={16} />
                  {t('common.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
