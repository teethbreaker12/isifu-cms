import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { api } from '../api/client';
import { DynamicForm } from '../components/DynamicForm';
import { Panel } from '../components/Panel';
import { t } from '../i18n';
import type { ContentEntry, ContentType } from '../types/cms';

export function EntriesPage() {
  const [types, setTypes] = useState<ContentType[]>([]);
  const [selected, setSelected] = useState('');
  const [entries, setEntries] = useState<ContentEntry[]>([]);
  const [data, setData] = useState<Record<string, unknown>>({});
  const [slug, setSlug] = useState('');
  const [editingEntry, setEditingEntry] = useState<ContentEntry | null>(null);
  const [creatingEntry, setCreatingEntry] = useState(false);
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

  async function save(nextStatus: ContentEntry['status']) {
    setError('');
    try {
      if (editingEntry) {
        await api.updateEntry(selected, editingEntry.id, { slug, status: nextStatus, data });
      } else {
        await api.createEntry(selected, { slug, status: nextStatus, data });
      }
      resetForm();
      setEntries(await api.entries(selected));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Save failed');
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    void save('draft');
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
    if (!window.confirm(t('entries.deleteConfirm'))) return;
    await api.deleteEntry(selected, entry.id);
    if (editingEntry?.id === entry.id) resetForm();
    setEntries(await api.entries(selected));
  }

  return (
    <div className="grid gap-5">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-950">{t('entries.title')}</h1>
      <select className="w-full rounded-md border border-stone-300 px-3 py-2 sm:w-fit" value={selected} onChange={(event) => setSelected(event.target.value)}>
        {types.map((type) => <option key={type.key} value={type.key}>{type.name}</option>)}
      </select>
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
            <form className="grid gap-4" onSubmit={submit}>
              <input className="rounded-md border border-stone-300 px-3 py-2" placeholder={t('entries.slugPlaceholder')} value={slug} onChange={(event) => setSlug(event.target.value)} />
              <DynamicForm fields={current.fields} value={data} onChange={setData} />
              {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="submit" className="w-full rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800 sm:w-fit">
                  {t('common.saveDraft')}
                </button>
                <button type="button" className="w-full rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white sm:w-fit" onClick={() => void save('published')}>
                  {t('common.publish')}
                </button>
              </div>
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
                <div className="text-sm text-stone-500">{entry.status} - {new Date(entry.updatedAt).toLocaleString()}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm" onClick={() => edit(entry)}>
                  <Pencil size={16} />
                  {t('common.edit')}
                </button>
                <button className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50" onClick={() => remove(entry)}>
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
