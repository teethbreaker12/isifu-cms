import { useEffect, useState } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
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
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [editingEntry, setEditingEntry] = useState<ContentEntry | null>(null);
  const [error, setError] = useState('');
  const current = types.find((type) => type.key === selected);

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

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    try {
      if (editingEntry) {
        await api.updateEntry(selected, editingEntry.id, { slug, status, data });
      } else {
        await api.createEntry(selected, { slug, status, data });
      }
      resetForm();
      setEntries(await api.entries(selected));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Save failed');
    }
  }

  function edit(entry: ContentEntry) {
    setEditingEntry(entry);
    setSlug(entry.slug ?? '');
    setStatus(entry.status);
    setData(entry.data ?? {});
  }

  function resetForm() {
    setData({});
    setSlug('');
    setStatus('draft');
    setEditingEntry(null);
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
      <select className="w-fit rounded-md border border-stone-300 px-3 py-2" value={selected} onChange={(event) => setSelected(event.target.value)}>
        {types.map((type) => <option key={type.key} value={type.key}>{type.name}</option>)}
      </select>
      {current && (
        <Panel
          title={`${editingEntry ? t('entries.edit') : t('entries.new')}: ${current.name}`}
          action={
            editingEntry ? (
              <button type="button" className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm" onClick={resetForm}>
                <X size={16} />
                {t('common.cancel')}
              </button>
            ) : null
          }
        >
          <form className="grid gap-4" onSubmit={submit}>
            <div className="grid gap-3 md:grid-cols-[1fr_180px]">
              <input className="rounded-md border border-stone-300 px-3 py-2" placeholder="slug" value={slug} onChange={(event) => setSlug(event.target.value)} />
              <select className="rounded-md border border-stone-300 px-3 py-2" value={status} onChange={(event) => setStatus(event.target.value as 'draft' | 'published')}>
                <option value="draft">{t('common.draft')}</option>
                <option value="published">{t('common.published')}</option>
              </select>
            </div>
            <DynamicForm fields={current.fields} value={data} onChange={setData} />
            {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <button className="w-fit rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white">{editingEntry ? t('common.update') : t('common.saveDraft')}</button>
          </form>
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
              <div className="flex gap-2">
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
