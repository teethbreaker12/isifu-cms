import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { api } from '../api/client';
import { Panel } from '../components/Panel';
import { t } from '../i18n';
import type { ContentField, ContentType, FieldType } from '../types/cms';

const emptyField: ContentField = { label: '', key: '', type: 'text', required: false };

export function ContentTypesPage() {
  const [items, setItems] = useState<ContentType[]>([]);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [fields, setFields] = useState<ContentField[]>([{ ...emptyField }]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = () => api.contentTypes().then(setItems);
  useEffect(() => void load(), []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    try {
      if (editingKey) {
        await api.updateContentType(editingKey, { name, fields });
      } else {
        await api.createContentType({ name, key, fields });
      }
      resetForm();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Save failed');
    }
  }

  function edit(item: ContentType) {
    setEditingKey(item.key);
    setName(item.name);
    setKey(item.key);
    setFields(item.fields.map(({ label, key: fieldKey, type, required, settings, order }) => ({ label, key: fieldKey, type, required, settings, order })));
  }

  function resetForm() {
    setName('');
    setKey('');
    setFields([{ ...emptyField }]);
    setEditingKey(null);
    setError('');
  }

  async function remove(keyToDelete: string) {
    if (!window.confirm(t('models.deleteConfirm'))) return;
    await api.deleteContentType(keyToDelete);
    if (editingKey === keyToDelete) resetForm();
    await load();
  }

  return (
    <div className="grid gap-5">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-950">{t('models.title')}</h1>
      <Panel
        title={t('models.editor')}
        action={
          editingKey ? (
            <button type="button" className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm" onClick={resetForm}>
              <X size={16} />
              {t('common.cancel')}
            </button>
          ) : null
        }
      >
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-3 lg:grid-cols-2">
            <input className="rounded-md border border-stone-300 px-3 py-2" placeholder={t('models.namePlaceholder')} value={name} onChange={(event) => setName(event.target.value)} />
            <input className="rounded-md border border-stone-300 px-3 py-2 disabled:bg-stone-100" disabled={Boolean(editingKey)} placeholder={t('models.keyPlaceholder')} value={key} onChange={(event) => setKey(event.target.value)} />
          </div>
          {fields.map((field, index) => (
            <div key={index} className="grid gap-3 rounded-md border border-stone-200 p-3">
              <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px_110px_44px]">
                <input className="rounded-md border border-stone-300 px-3 py-2" placeholder={t('models.fieldLabelPlaceholder')} value={field.label} onChange={(event) => setFields(fields.map((item, i) => (i === index ? { ...item, label: event.target.value } : item)))} />
                <input className="rounded-md border border-stone-300 px-3 py-2" placeholder={t('models.fieldKeyPlaceholder')} value={field.key} onChange={(event) => setFields(fields.map((item, i) => (i === index ? { ...item, key: event.target.value } : item)))} />
                <select className="rounded-md border border-stone-300 px-3 py-2" value={field.type} onChange={(event) => setFields(fields.map((item, i) => (i === index ? { ...item, type: event.target.value as FieldType, settings: event.target.value === 'image' ? item.settings : undefined } : item)))}>
                  {(['text', 'textarea', 'richtext', 'image', 'lucideIcon', 'boolean', 'date', 'repeater'] as FieldType[]).map((type) => <option key={type} value={type}>{t(`fields.${type}`)}</option>)}
                </select>
                <label className="flex items-center gap-2 text-sm text-stone-600">
                  <input type="checkbox" checked={field.required} onChange={(event) => setFields(fields.map((item, i) => (i === index ? { ...item, required: event.target.checked } : item)))} />
                  {t('common.required')}
                </label>
                <button
                  type="button"
                  title={t('models.removeField')}
                  className="grid h-10 w-10 place-items-center rounded-md border border-stone-300 text-red-600 hover:bg-red-50"
                  onClick={() => setFields(fields.length > 1 ? fields.filter((_, i) => i !== index) : [{ ...emptyField }])}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {field.type === 'image' && (
                <div className="grid gap-2 rounded-md bg-stone-50 p-3 lg:grid-cols-[180px_160px]">
                  <label className="flex items-center gap-2 text-sm text-stone-600">
                    <input
                      type="checkbox"
                      checked={Boolean(field.settings?.multiple)}
                      onChange={(event) => setFields(fields.map((item, i) => (i === index ? { ...item, settings: { ...(item.settings ?? {}), multiple: event.target.checked } } : item)))}
                    />
                    {t('models.allowMultipleImages')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="rounded-md border border-stone-300 px-3 py-2 text-sm"
                    placeholder={t('models.maxImages')}
                    value={String(field.settings?.maxItems ?? '')}
                    onChange={(event) => setFields(fields.map((item, i) => (i === index ? { ...item, settings: { ...(item.settings ?? {}), maxItems: Number(event.target.value) || undefined } } : item)))}
                  />
                </div>
              )}
            </div>
          ))}
          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm" onClick={() => setFields([...fields, { ...emptyField }])}>
              <Plus size={16} />
              {t('models.addField')}
            </button>
            <button className="rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white">{editingKey ? t('common.update') : t('common.create')}</button>
          </div>
        </form>
      </Panel>
      <Panel title={t('models.existing')}>
        <div className="grid gap-3">
          {items.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 rounded-md border border-stone-200 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-semibold text-stone-950">{item.name}</div>
                <div className="text-sm text-stone-500">/{item.key} - {item.fields.length} fields</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm" onClick={() => edit(item)}>
                  <Pencil size={16} />
                  {t('common.edit')}
                </button>
                <button className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50" onClick={() => remove(item.key)}>
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
