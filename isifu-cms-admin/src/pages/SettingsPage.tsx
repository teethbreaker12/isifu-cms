import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { api, getCurrentUser, setCurrentUser } from '../api/client';
import { Panel } from '../components/Panel';
import { t } from '../i18n';
import type { User } from '../types/cms';

export function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(() => getCurrentUser());
  const [setup, setSetup] = useState<{ secret: string; qrCode: string; otpauth: string } | null>(null);
  const [totpCode, setTotpCode] = useState('');

  async function refreshCurrentUser() {
    const freshUser = await api.me();
    setCurrentUser(freshUser);
    setUser(freshUser);
  }

  useEffect(() => {
    void refreshCurrentUser().catch(() => undefined);
  }, []);

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    await api.changePassword({ currentPassword, newPassword });
    setCurrentPassword('');
    setNewPassword('');
    setMessage(t('settings.passwordChanged'));
  }

  async function setupMy2fa() {
    setError('');
    setMessage('');
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
      await refreshCurrentUser();
      setMessage(t('settings.twoFactorEnabled'));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Invalid two-factor code');
    }
  }

  async function disableMy2fa() {
    setError('');
    await api.disableMyTwoFactor();
    setSetup(null);
    setTotpCode('');
    await refreshCurrentUser();
    setMessage(t('settings.twoFactorDisabled'));
  }

  return (
    <div className="grid gap-5">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-950">{t('settings.title')}</h1>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={t('settings.password')}>
          <form className="grid gap-4" onSubmit={changePassword}>
            <input className="rounded-md border border-stone-300 px-3 py-2" type="password" required placeholder={t('settings.currentPassword')} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
            <input className="rounded-md border border-stone-300 px-3 py-2" type="password" required minLength={8} placeholder={t('settings.newPassword')} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            <button className="w-fit rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white">{t('settings.changePassword')}</button>
          </form>
        </Panel>

        <Panel title={t('users.twoFactor')}>
          <div className="grid gap-4">
            <div className="flex items-center gap-2">
              <span className={`rounded-md px-2 py-1 text-xs font-semibold ${user?.twoFactorEnabled ? 'bg-blue-50 text-blue-700' : 'bg-stone-100 text-stone-600'}`}>
                {user?.twoFactorEnabled ? t('users.twoFactorEnabled') : t('users.twoFactorDisabled')}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {!user?.twoFactorEnabled && (
                <button type="button" className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm font-medium" onClick={setupMy2fa}>
                  <ShieldCheck size={16} />
                  {t('users.setupMy2fa')}
                </button>
              )}
              <button type="button" disabled={!user?.twoFactorEnabled} className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:border-stone-200 disabled:text-stone-400" onClick={disableMy2fa}>
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
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>}
      {message && <div className="rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">{message}</div>}
    </div>
  );
}
