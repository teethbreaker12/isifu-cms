import { CheckCircle2, CircleDashed, Send, FilePenLine } from 'lucide-react';
import { t } from '../i18n';
import type { PublishStatus } from '../types/cms';

export function StatusBadge({ status }: { status: PublishStatus }) {
  const Icon = status === 'published' ? CheckCircle2 : CircleDashed;

  return (
    <span
      className={`inline-flex w-fit max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold ${
        status === 'published'
          ? 'border-[color:var(--app-accent-border)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent)]'
          : 'border-stone-200 bg-stone-50 text-stone-600'
      }`}
    >
      <Icon size={14} aria-hidden="true" />
      <span className="truncate">{t(`common.${status}`)}</span>
    </span>
  );
}

export function StatusSummary({ status }: { status: PublishStatus }) {
  return (
    <div className="grid min-h-10 min-w-0 gap-1 rounded-md border border-stone-200 bg-white px-3 py-2">
      <StatusBadge status={status} />
      <span className="block min-w-0 truncate text-xs leading-5 text-stone-500">
        {status === 'published' ? t('common.publishedHelp') : t('common.draftHelp')}
      </span>
    </div>
  );
}

export function PublishActions({
  status,
  onCancel,
  draftLabel = t('common.saveAsDraft'),
  publishLabel = t('common.publish'),
}: {
  status: PublishStatus;
  onCancel: () => void;
  draftLabel?: string;
  publishLabel?: string;
}) {
  return (
    <div className="grid gap-3 border-t border-stone-200 pt-4">
      <div className="flex flex-col gap-2 rounded-lg border border-stone-200 bg-stone-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-stone-950">{t('common.publishState')}</div>
          <p className="mt-1 text-xs leading-5 text-stone-500">
            {status === 'published' ? t('common.publishedHelp') : t('common.draftHelp')}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="w-full rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 sm:w-fit" onClick={onCancel}>
          {t('common.cancel')}
        </button>
        <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800 sm:w-fit">
          <FilePenLine size={16} />
          {draftLabel}
        </button>
        <button type="submit" name="intent" value="publish" className="accent-bg inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold sm:w-fit">
          <Send size={16} />
          {publishLabel}
        </button>
      </div>
    </div>
  );
}
