import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldOff, Trash2, UserPlus } from 'lucide-react';
import { api, setCurrentUser } from '../api/client';
import { Modal } from '../components/Modal';
import { Panel } from '../components/Panel';
import { SelectField } from '../components/SelectField';
import { useToast } from '../components/Toast';
import { t } from '../i18n';
import type { Role, User } from '../types/cms';

export function UsersPage() {
  const { notify } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('EDITOR');
  const [error, setError] = useState('');
  const [setup, setSetup] = useState<{ secret: string; qrCode: string; otpauth: string } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [passwords, setPasswords] = useState<Record<number, string>>({});
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [resetUser, setResetUser] = useState<User | null>(null);

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
      notify(t('users.created'));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not create user';
      setError(message);
      notify(message, 'error');
    }
  }

  async function remove(user: User) {
    try {
      await api.deleteUser(user.id);
      setDeleteUser(null);
      await load();
      notify(t('users.deleted'));
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'Delete failed', 'error');
    }
  }

  async function disableUser2fa(user: User) {
    try {
      await api.disableUserTwoFactor(user.id);
      await load();
      notify(t('settings.twoFactorDisabled'));
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'Could not disable 2FA', 'error');
    }
  }

  async function resetPassword(user: User) {
    const password = passwords[user.id];
    if (!password || password.length < 8) return;
    try {
      await api.updateUser(user.id, { password });
      setPasswords((current) => ({ ...current, [user.id]: '' }));
      setResetUser(null);
      await load();
      notify(t('users.passwordReset'));
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'Could not reset password', 'error');
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
      setCurrentUser(await api.me());
      await load();
      notify(t('settings.twoFactorEnabled'));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Invalid two-factor code';
      setError(message);
      notify(message, 'error');
    }
  }

  async function disableMy2fa() {
    try {
      await api.disableMyTwoFactor();
      setSetup(null);
      setTotpCode('');
      setCurrentUser(await api.me());
      await load();
      notify(t('settings.twoFactorDisabled'));
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'Could not disable 2FA', 'error');
    }
  }

  return (
    <div className="grid gap-5">
      <h1 className="page-title">{t('users.title')}</h1>
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Panel title={t('users.create')}>
          <form className="grid gap-4" onSubmit={createUser}>
            <div className="grid gap-3 lg:grid-cols-2">
              <input className="rounded-md border border-stone-300 px-3 py-2" placeholder={t('users.name')} value={name} onChange={(event) => setName(event.target.value)} />
              <input className="rounded-md border border-stone-300 px-3 py-2" placeholder={t('users.email')} required value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px]">
              <input className="rounded-md border border-stone-300 px-3 py-2" placeholder={t('users.password')} required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              <SelectField
                value={role}
                options={[
                  { value: 'EDITOR', label: t('users.editor') },
                  { value: 'ADMIN', label: t('users.admin') },
                ]}
                onChange={(next) => setRole(next as Role)}
              />
            </div>
            {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white sm:w-fit">
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
                <div className="break-all rounded-md bg-stone-100 px-3 py-2 font-mono text-xs text-stone-700">{setup.secret}</div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input className="w-full rounded-md border border-stone-300 px-3 py-2 sm:w-40" name="one-time-code" type="text" placeholder={t('users.twoFactorCodePlaceholder')} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9\\s-]*" maxLength={12} value={totpCode} onChange={(event) => setTotpCode(event.target.value)} />
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
            <div key={user.id} className="flex flex-col gap-3 rounded-md border border-stone-200 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="font-semibold text-stone-950">{user.name || user.email}</div>
                <div className="break-all text-sm text-stone-500">{user.email}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-700">{user.role}</span>
                <span className={`rounded-md px-2 py-1 text-xs font-semibold ${user.twoFactorEnabled ? 'accent-soft border' : 'bg-stone-100 text-stone-600'}`}>
                  {user.twoFactorEnabled ? t('users.twoFactorEnabled') : t('users.twoFactorDisabled')}
                </span>
                {user.twoFactorEnabled && (
                  <button className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm" onClick={() => disableUser2fa(user)}>
                    <ShieldOff size={16} />
                    {t('users.disable2fa')}
                  </button>
                )}
                <input
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm sm:w-44"
                  type="password"
                  placeholder={t('users.newPassword')}
                  value={passwords[user.id] ?? ''}
                  onChange={(event) => setPasswords((current) => ({ ...current, [user.id]: event.target.value }))}
                />
                <button className="rounded-md border border-stone-300 px-3 py-2 text-sm" onClick={() => setResetUser(user)} disabled={!passwords[user.id] || passwords[user.id].length < 8}>
                  {t('users.resetPassword')}
                </button>
                <button className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50" onClick={() => setDeleteUser(user)}>
                  <Trash2 size={16} />
                  {t('common.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Panel>
      {resetUser && (
        <Modal
          title={t('users.resetPassword')}
          description={resetUser.email}
          onClose={() => setResetUser(null)}
          footer={
            <>
              <button type="button" className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700" onClick={() => setResetUser(null)}>
                {t('common.cancel')}
              </button>
              <button type="button" className="accent-bg rounded-md px-3 py-2 text-sm font-semibold" onClick={() => void resetPassword(resetUser)}>
                {t('common.update')}
              </button>
            </>
          }
        >
          <p className="text-sm leading-6 text-stone-600">{t('users.resetPasswordConfirm')}</p>
        </Modal>
      )}
      {deleteUser && (
        <Modal
          title={t('users.deleteTitle')}
          description={deleteUser.email}
          onClose={() => setDeleteUser(null)}
          footer={
            <>
              <button type="button" className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700" onClick={() => setDeleteUser(null)}>
                {t('common.cancel')}
              </button>
              <button type="button" className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" onClick={() => void remove(deleteUser)}>
                {t('common.delete')}
              </button>
            </>
          }
        >
          <p className="text-sm leading-6 text-stone-600">{t('users.deleteConfirm')}</p>
        </Modal>
      )}
    </div>
  );
}
