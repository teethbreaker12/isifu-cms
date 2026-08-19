import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { api } from '../api/client';
import { DynamicForm } from '../components/DynamicForm';
import { IconButton } from '../components/IconButton';
import { Modal } from '../components/Modal';
import { Panel } from '../components/Panel';
import { PublishActions, StatusBadge, StatusSummary } from '../components/PublishControls';
import { SelectField } from '../components/SelectField';
import { useToast } from '../components/Toast';
import { t } from '../i18n';
import type { ContentEntry, ContentType, PublishStatus } from '../types/cms';

export function EntriesPage() {
  const { notify } = useToast();
  const [types, setTypes] = useState<ContentType[]>([]);
  const [selected, setSelected] = useState('');
  const [entries, setEntries] = useState<ContentEntry[]>([]);
  const [data, setData] = useState<Record<string, unknown>>({});
  const [slug, setSlug] = useState('');
  const [editingEntry, setEditingEntry] = useState<ContentEntry | null>(null);
  const [creatingEntry, setCreatingEntry] = useState(false);
  const [deleteEntry, setDeleteEntry] = useState<ContentEntry | null>(null);
  const [error, setError] = useState('');
  const current = types.find((type) => type.key === selected);
  const isEditing = creatingEntry || Boolean(editingEntry);

  useEffect(() => {
    api.contentTypes().then((result) => {
      setTypes(result);
      setSelected(result[0]?.key ?? '');
    });
  }, []);

  useEffect(() => {
    if (selected) {
      resetForm();
      api.entries(selected).then(setEntries);
    }
  }, [selected]);

  const currentStatus: PublishStatus = editingEntry?.status ?? 'draft';

  async function save(nextStatus: PublishStatus) {
    setError('');
    try {
      if (editingEntry) {
        await api.updateEntry(selected, editingEntry.id, { slug, status: nextStatus, data });
      } else {
        await api.createEntry(selected, { slug, status: nextStatus, data });
      }
      resetForm();
      setEntries(await api.entries(selected));
      notify(nextStatus === 'published' ? t('entries.published') : t('entries.saved'));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Save failed';
      setError(message);
      notify(message, 'error');
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    void save(submitter?.value === 'publish' ? 'published' : 'draft');
  }

  function startCreate() {
    setData({});
    setSlug('');
    setEditingEntry(null);
    setCreatingEntry(true);
    setError('');
  }

  function edit(entry: ContentEntry) {
    setEditingEntry(entry);
    setCreatingEntry(false);
    setSlug(entry.slug ?? '');
    setData(entry.data ?? {});
  }

  function resetForm() {
    setData({});
    setSlug('');
    setEditingEntry(null);
    setCreatingEntry(false);
    setError('');
  }

  async function remove(entry: ContentEntry) {
    try {
      await api.deleteEntry(selected, entry.id);
      setDeleteEntry(null);
      if (editingEntry?.id === entry.id) resetForm();
      setEntries(await api.entries(selected));
      notify(t('entries.deleted'));
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'Delete failed', 'error');
    }
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="page-title">{t('entries.title')}</h1>
          <p className="page-subtitle mt-1">{t('entries.subtitle')}</p>
        </div>
        <div className="grid w-full gap-1 text-sm font-medium text-stone-700 xl:w-80">
          <span>{t('entries.modelLabel')}</span>
          <SelectField
            value={selected}
            options={types.map((type) => ({ value: type.key, label: type.name }))}
            onChange={setSelected}
          />
        </div>
      </div>
      {current && (
        <Panel
          title={`${editingEntry ? t('entries.edit') : t('entries.new')}: ${current.name}`}
          action={
            isEditing ? (
              <button type="button" className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm" onClick={resetForm}>
                <X size={16} />
                {t('common.cancel')}
              </button>
            ) : (
              <button type="button" className="inline-flex items-center gap-2 rounded-md bg-stone-950 px-3 py-2 text-sm font-medium text-white" onClick={startCreate}>
                <Plus size={16} />
                {t('entries.new')}
              </button>
            )
          }
        >
          {isEditing ? (
            <form className="grid gap-5" onSubmit={submit}>
              <section className="grid gap-3 rounded-lg border border-stone-200 bg-stone-50/70 p-4">
                <div>
                  <h3 className="text-sm font-semibold text-stone-950">{t('entries.metaTitle')}</h3>
                  <p className="mt-1 text-xs leading-5 text-stone-500">{t('entries.metaHelp')}</p>
                </div>
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                  <label className="grid gap-1 text-sm font-medium text-stone-700">
                    <span>{t('entries.slugLabel')}</span>
                    <input
                      className="rounded-md border border-stone-300 px-3 py-2 font-normal"
                      placeholder={t('entries.slugPlaceholder')}
                      value={slug}
                      onChange={(event) => setSlug(event.target.value)}
                    />
                  </label>
                  <div className="grid gap-1 text-sm font-medium text-stone-700">
                    <span>{t('common.status')}</span>
                    <StatusSummary status={currentStatus} />
                  </div>
                </div>
              </section>

              <section className="grid gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-stone-950">{t('entries.contentTitle')}</h3>
                  <p className="mt-1 text-xs leading-5 text-stone-500">{t('entries.contentHelp')}</p>
                </div>
                <DynamicForm fields={current.fields} value={data} onChange={setData} variant="entry" />
              </section>

              {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
              <PublishActions status={currentStatus} onCancel={resetForm} />
            </form>
          ) : (
            <p className="text-sm leading-6 text-stone-600">{t('entries.editorHint')}</p>
          )}
        </Panel>
      )}
      {!current && <Panel title={t('entries.title')}><p className="text-sm text-stone-500">{t('entries.noModel')}</p></Panel>}
      <Panel title={t('entries.existing')}>
        <div className="grid gap-3">
          {entries.map((entry) => (
            <div key={entry.id} className="flex flex-col gap-3 rounded-md border border-stone-200 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-semibold text-stone-950">{entry.slug || `Entry ${entry.id}`}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-stone-500">
                  <StatusBadge status={entry.status} />
                  <span>{new Date(entry.updatedAt).toLocaleString()}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <IconButton label={t('common.edit')} icon={<Pencil size={16} />} onClick={() => edit(entry)} />
                <IconButton label={t('common.delete')} icon={<Trash2 size={16} />} tone="danger" onClick={() => setDeleteEntry(entry)} />
              </div>
            </div>
          ))}
        </div>
      </Panel>
      {deleteEntry && (
        <Modal
          title={t('entries.deleteTitle')}
          description={deleteEntry.slug || `Entry ${deleteEntry.id}`}
          onClose={() => setDeleteEntry(null)}
          footer={
            <>
              <button type="button" className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700" onClick={() => setDeleteEntry(null)}>
                {t('common.cancel')}
              </button>
              <button type="button" className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" onClick={() => void remove(deleteEntry)}>
                {t('common.delete')}
              </button>
            </>
          }
        >
          <p className="text-sm leading-6 text-stone-600">{t('entries.deleteConfirm')}</p>
        </Modal>
      )}
    </div>
  );
}
