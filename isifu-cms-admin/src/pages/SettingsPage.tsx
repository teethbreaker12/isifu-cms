import { useEffect, useState } from 'react';
import { MailCheck, Send, ShieldCheck, ShieldOff } from 'lucide-react';
import { api, getCurrentUser, setCurrentUser } from '../api/client';
import { isAdmin } from '../auth';
import { Modal } from '../components/Modal';
import { Panel } from '../components/Panel';
import { useToast } from '../components/Toast';
import { t } from '../i18n';
import { useTheme, type Accent } from '../theme';
import type { SmtpSettings, User } from '../types/cms';

const accentOptions: Array<{ value: Accent; color: string }> = [
  { value: 'blue', color: '#2563eb' },
  { value: 'green', color: '#0f766e' },
  { value: 'violet', color: '#7c3aed' },
  { value: 'amber', color: '#b45309' },
  { value: 'rose', color: '#be123c' },
  { value: 'slate', color: '#475569' },
];

const emptySmtpSettings: SmtpSettings = {
  enabled: false,
  host: '',
  port: 587,
  secure: false,
  user: '',
  pass: '',
  fromName: '',
  fromEmail: '',
};

export function SettingsPage() {
  const { notify } = useToast();
  const { accent, setAccent } = useTheme();
  const admin = isAdmin();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(() => getCurrentUser());
  const [setup, setSetup] = useState<{ secret: string; qrCode: string; otpauth: string } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [smtp, setSmtp] = useState<SmtpSettings & { hasPassword?: boolean; source?: 'database' | 'env' }>(emptySmtpSettings);
  const [smtpBusy, setSmtpBusy] = useState(false);

  async function refreshCurrentUser() {
    const freshUser = await api.me();
    setCurrentUser(freshUser);
    setUser(freshUser);
  }

  useEffect(() => {
    void refreshCurrentUser().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!admin) return;
    api.smtpSettings()
      .then((settings) => {
        setSmtp({ ...settings, pass: '' });
      })
      .catch((caught) => notify(caught instanceof Error ? caught.message : 'Could not load SMTP settings', 'error'));
  }, [admin, notify]);

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    try {
      await api.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setPasswordModalOpen(false);
      notify(t('settings.passwordChanged'));
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'Could not change password', 'error');
    }
  }

  async function setupMy2fa() {
    setError('');
    try {
      setSetup(await api.setupTwoFactor());
      notify(t('users.twoFactorSetupStarted'));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not start 2FA setup';
      setError(message);
      notify(message, 'error');
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
      notify(t('settings.twoFactorEnabled'));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Invalid two-factor code';
      setError(message);
      notify(message, 'error');
    }
  }

  async function disableMy2fa() {
    setError('');
    await api.disableMyTwoFactor();
    setSetup(null);
    setTotpCode('');
    await refreshCurrentUser();
    notify(t('settings.twoFactorDisabled'));
  }

  function updateSmtp(patch: Partial<SmtpSettings>) {
    setSmtp((current) => ({ ...current, ...patch }));
  }

  async function saveSmtp(event: React.FormEvent) {
    event.preventDefault();
    setSmtpBusy(true);
    try {
      const saved = await api.updateSmtpSettings(smtp);
      setSmtp({ ...saved, pass: '' });
      notify(t('settings.smtpSaved'));
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'Could not save SMTP settings', 'error');
    } finally {
      setSmtpBusy(false);
    }
  }

  async function testSmtp() {
    setSmtpBusy(true);
    try {
      await api.testSmtpSettings(smtp);
      notify(t('settings.smtpTestSent'));
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'SMTP test failed', 'error');
    } finally {
      setSmtpBusy(false);
    }
  }

  return (
    <div className="grid gap-5">
      <h1 className="page-title">{t('settings.title')}</h1>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={t('settings.accent')}>
          <div className="grid gap-4">
            <p className="text-sm leading-6 text-stone-600">{t('settings.accentHelp')}</p>
            {!admin && <p className="text-sm leading-6 text-stone-500">{t('settings.accentAdminOnly')}</p>}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {accentOptions.map((option) => {
                const active = accent === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`flex min-h-12 items-center gap-3 rounded-md border px-3 py-2 text-left text-sm font-semibold ${
                      active ? 'accent-soft shadow-sm' : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                    } disabled:cursor-not-allowed disabled:opacity-55`}
                    disabled={!admin}
                    onClick={() => {
                      if (admin) setAccent(option.value);
                    }}
                    aria-pressed={active}
                  >
                    <span
                      className="h-5 w-5 shrink-0 rounded-full border border-black/10"
                      style={{ backgroundColor: option.color }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 truncate">{t(`settings.accent.${option.value}`)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Panel>

        <Panel title={t('settings.password')}>
          <div className="flex flex-col gap-3">
            <p className="text-sm leading-6 text-stone-600">{t('settings.passwordHelp')}</p>
            <button type="button" className="w-full rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white sm:w-fit" onClick={() => setPasswordModalOpen(true)}>
              {t('settings.changePassword')}
            </button>
          </div>
        </Panel>

        <Panel title={t('users.twoFactor')}>
          <div className="grid gap-4">
            <div className="flex items-center gap-2">
              <span className={`rounded-md px-2 py-1 text-xs font-semibold ${user?.twoFactorEnabled ? 'accent-soft border' : 'bg-stone-100 text-stone-600'}`}>
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
                <div className="break-all rounded-md bg-stone-100 px-3 py-2 font-mono text-xs text-stone-700">{setup.secret}</div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input className="w-full rounded-md border border-stone-300 px-3 py-2 sm:w-40" name="one-time-code" type="text" placeholder={t('users.twoFactorCodePlaceholder')} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9\\s-]*" maxLength={12} value={totpCode} onChange={(event) => setTotpCode(event.target.value)} />
                  <button className="rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white">{t('users.verify2fa')}</button>
                </div>
              </form>
            )}
          </div>
        </Panel>

        {admin && (
          <Panel title={t('settings.smtp')}>
            <form className="grid gap-4" onSubmit={saveSmtp}>
              <div>
                <p className="text-sm leading-6 text-stone-600">{t('settings.smtpHelp')}</p>
                {smtp.source && (
                  <p className="mt-1 text-xs leading-5 text-stone-500">
                    {t('settings.smtpSource')}: {smtp.source === 'database' ? t('settings.smtpSourceDatabase') : t('settings.smtpSourceEnv')}
                  </p>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
                <input type="checkbox" checked={smtp.enabled} onChange={(event) => updateSmtp({ enabled: event.target.checked })} />
                {t('settings.smtpEnabled')}
              </label>
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_8rem_9rem]">
                <label className="grid gap-1 text-sm font-medium text-stone-700">
                  <span>{t('settings.smtpHost')}</span>
                  <input className="rounded-md border border-stone-300 px-3 py-2 font-normal" value={smtp.host} onChange={(event) => updateSmtp({ host: event.target.value })} placeholder="smtp.domain.com" />
                </label>
                <label className="grid gap-1 text-sm font-medium text-stone-700">
                  <span>{t('settings.smtpPort')}</span>
                  <input className="rounded-md border border-stone-300 px-3 py-2 font-normal" type="number" min={1} max={65535} value={smtp.port} onChange={(event) => updateSmtp({ port: Number(event.target.value) })} />
                </label>
                <label className="flex items-end gap-2 pb-2 text-sm font-medium text-stone-700">
                  <input type="checkbox" checked={smtp.secure} onChange={(event) => updateSmtp({ secure: event.target.checked })} />
                  {t('settings.smtpSecure')}
                </label>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium text-stone-700">
                  <span>{t('settings.smtpUser')}</span>
                  <input className="rounded-md border border-stone-300 px-3 py-2 font-normal" value={smtp.user} onChange={(event) => updateSmtp({ user: event.target.value })} placeholder="cms@domain.com" />
                </label>
                <label className="grid gap-1 text-sm font-medium text-stone-700">
                  <span>{t('settings.smtpPass')}</span>
                  <input className="rounded-md border border-stone-300 px-3 py-2 font-normal" type="password" value={smtp.pass || ''} onChange={(event) => updateSmtp({ pass: event.target.value })} placeholder={smtp.hasPassword ? t('settings.smtpPassKeep') : t('settings.smtpPass')} />
                </label>
                <label className="grid gap-1 text-sm font-medium text-stone-700">
                  <span>{t('settings.smtpFromName')}</span>
                  <input className="rounded-md border border-stone-300 px-3 py-2 font-normal" value={smtp.fromName} onChange={(event) => updateSmtp({ fromName: event.target.value })} placeholder="ISIFU CMS" />
                </label>
                <label className="grid gap-1 text-sm font-medium text-stone-700">
                  <span>{t('settings.smtpFromEmail')}</span>
                  <input className="rounded-md border border-stone-300 px-3 py-2 font-normal" type="email" value={smtp.fromEmail} onChange={(event) => updateSmtp({ fromEmail: event.target.value })} placeholder="cms@domain.com" />
                </label>
              </div>
              <div className="grid gap-3 rounded-lg border border-stone-200 bg-stone-50/70 p-3">
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button type="button" disabled={smtpBusy} className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 disabled:opacity-50 sm:w-fit" onClick={testSmtp}>
                    <Send size={16} />
                    {t('settings.smtpTest')}
                  </button>
                  <button disabled={smtpBusy} className="accent-bg inline-flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-50 sm:w-fit">
                    <MailCheck size={16} />
                    {t('common.save')}
                  </button>
                </div>
              </div>
            </form>
          </Panel>
        )}
      </div>
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>}
      {passwordModalOpen && (
        <Modal title={t('settings.changePassword')} description={t('settings.passwordModalText')} onClose={() => setPasswordModalOpen(false)}>
          <form className="grid gap-4" onSubmit={changePassword}>
            <input className="rounded-md border border-stone-300 px-3 py-2" type="password" required placeholder={t('settings.currentPassword')} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoFocus />
            <input className="rounded-md border border-stone-300 px-3 py-2" type="password" required minLength={8} placeholder={t('settings.newPassword')} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            <div className="flex justify-end gap-2">
              <button type="button" className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700" onClick={() => setPasswordModalOpen(false)}>
                {t('common.cancel')}
              </button>
              <button className="accent-bg rounded-md px-3 py-2 text-sm font-semibold">
                {t('settings.changePassword')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
