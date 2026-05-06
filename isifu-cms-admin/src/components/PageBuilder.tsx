import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { t } from '../i18n';
import type { ContentEntry, ContentType, PageBlock } from '../types/cms';
import { DynamicForm } from './DynamicForm';

function SortableBlock({
  block,
  contentTypes,
  entries,
  onChange,
  onRemove,
  canManageStructure,
}: {
  block: PageBlock;
  contentTypes: ContentType[];
  entries: ContentEntry[];
  onChange: (block: PageBlock) => void;
  onRemove: () => void;
  canManageStructure: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id, disabled: !canManageStructure });
  const setProp = (key: string, value: unknown) => onChange({ ...block, props: { ...block.props, [key]: value } });
  const fieldBlockTypes = ['text', 'textarea', 'richtext', 'image', 'lucideIcon', 'boolean', 'date', 'repeater'];
  const blockLabel = {
    text: t('fields.text'),
    textarea: t('fields.textarea'),
    richtext: t('fields.richtext'),
    image: t('fields.image'),
    lucideIcon: t('fields.lucideIcon'),
    boolean: t('fields.boolean'),
    date: t('fields.date'),
    repeater: t('fields.repeater'),
    hero: t('pageBuilder.hero'),
    cta: t('pageBuilder.cta'),
    entry: t('pageBuilder.entry'),
  }[block.type] ?? block.type;

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="rounded-md border border-stone-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        {canManageStructure && (
          <button className="rounded p-1 text-stone-500 hover:bg-stone-100" {...attributes} {...listeners} aria-label="Drag block">
            <GripVertical size={18} />
          </button>
        )}
        {canManageStructure ? (
          <select
            className="min-w-0 flex-1 rounded-md border border-stone-300 px-2 py-1 text-sm"
            value={block.type}
            onChange={(event) => onChange({ ...block, type: event.target.value as PageBlock['type'] })}
          >
            <option value="text">{t('pageBuilder.text')}</option>
            <option value="textarea">{t('fields.textarea')}</option>
            <option value="richtext">{t('fields.richtext')}</option>
            <option value="image">{t('pageBuilder.image')}</option>
            <option value="lucideIcon">{t('fields.lucideIcon')}</option>
            <option value="boolean">{t('fields.boolean')}</option>
            <option value="date">{t('fields.date')}</option>
            <option value="repeater">{t('fields.repeater')}</option>
            <option value="hero">{t('pageBuilder.hero')}</option>
            <option value="cta">{t('pageBuilder.cta')}</option>
            <option value="entry">{t('pageBuilder.entry')}</option>
          </select>
        ) : (
          <div className="mr-auto rounded-md bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600">{blockLabel}</div>
        )}
        {canManageStructure && (
          <button className="rounded p-1 text-red-600 hover:bg-red-50" onClick={onRemove} aria-label="Remove block">
            <Trash2 size={18} />
          </button>
        )}
      </div>
      {block.type === 'entry' ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <input className="rounded-md border border-stone-300 px-3 py-2 text-sm" placeholder={t('pageBuilder.blockTitle')} value={String(block.props.title ?? '')} onChange={(event) => setProp('title', event.target.value)} />
          <select
            className="rounded-md border border-stone-300 px-3 py-2 text-sm"
            value={String(block.props.contentType ?? '')}
            disabled={!canManageStructure}
            onChange={(event) => {
              onChange({ ...block, props: { ...block.props, contentType: event.target.value, entryId: '' } });
            }}
          >
            <option value="">{t('pageBuilder.chooseModel')}</option>
            {contentTypes.map((type) => (
              <option key={type.key} value={type.key}>{type.name}</option>
            ))}
          </select>
          <select className="rounded-md border border-stone-300 px-3 py-2 text-sm" value={String(block.props.entryId ?? '')} onChange={(event) => setProp('entryId', event.target.value)}>
            <option value="">{t('pageBuilder.chooseEntry')}</option>
            {entries.map((entry) => (
              <option key={entry.id} value={String(entry.id)}>{entry.slug || `#${entry.id}`}</option>
            ))}
          </select>
          <select className="rounded-md border border-stone-300 px-3 py-2 text-sm" disabled={!canManageStructure} value={String(block.props.layout ?? 'card')} onChange={(event) => setProp('layout', event.target.value)}>
            <option value="card">{t('pageBuilder.layoutCard')}</option>
            <option value="full">{t('pageBuilder.layoutFull')}</option>
            <option value="list">{t('pageBuilder.layoutList')}</option>
          </select>
        </div>
      ) : fieldBlockTypes.includes(block.type) ? (
        <div className="grid gap-3">
          {canManageStructure && <input className="rounded-md border border-stone-300 px-3 py-2 text-sm" placeholder={t('pageBuilder.blockTitle')} value={String(block.props.label ?? '')} onChange={(event) => setProp('label', event.target.value)} />}
          {canManageStructure && block.type === 'image' && (
            <div className="grid gap-2 rounded-md bg-stone-50 p-3 lg:grid-cols-[180px_160px]">
              <label className="flex items-center gap-2 text-sm text-stone-600">
                <input type="checkbox" checked={Boolean(block.props.multiple)} onChange={(event) => setProp('multiple', event.target.checked)} />
                {t('models.allowMultipleImages')}
              </label>
              <input className="rounded-md border border-stone-300 px-3 py-2 text-sm" type="number" min="1" placeholder={t('models.maxImages')} value={String(block.props.maxItems ?? '')} onChange={(event) => setProp('maxItems', Number(event.target.value) || undefined)} />
            </div>
          )}
          <DynamicForm
            fields={[{
              label: String(block.props.label || t(`fields.${block.type as 'text'}`)),
              key: 'value',
              type: block.type as never,
              settings: block.type === 'image' ? { multiple: Boolean(block.props.multiple), maxItems: Number(block.props.maxItems || 0) } : undefined,
            }]}
            value={{ value: block.props.value }}
            onChange={(next) => setProp('value', next.value)}
          />
        </div>
      ) : (
        <textarea
          className="min-h-24 w-full rounded-md border border-stone-300 px-3 py-2 font-mono text-xs"
          value={JSON.stringify(block.props, null, 2)}
          onChange={(event) => {
            try {
              onChange({ ...block, props: JSON.parse(event.target.value) });
            } catch {
              onChange(block);
            }
          }}
        />
      )}
    </div>
  );
}

export function PageBuilder({ blocks, onChange, canManageStructure = true }: { blocks: PageBlock[]; onChange: (blocks: PageBlock[]) => void; canManageStructure?: boolean }) {
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [entriesByType, setEntriesByType] = useState<Record<string, ContentEntry[]>>({});
  const selectedTypes = useMemo(
    () => Array.from(new Set(blocks.map((block) => String(block.props.contentType || '')).filter(Boolean))),
    [blocks],
  );

  useEffect(() => {
    api.contentTypes().then(setContentTypes).catch(() => setContentTypes([]));
  }, []);

  useEffect(() => {
    for (const type of selectedTypes) {
      setEntriesByType((current) => {
        if (current[type]) return current;
        api.entries(type).then((entries) => setEntriesByType((latest) => ({ ...latest, [type]: entries }))).catch(() => undefined);
        return { ...current, [type]: [] };
      });
    }
  }, [selectedTypes]);

  const addBlock = () => onChange([...blocks, { id: crypto.randomUUID(), type: 'text', props: { text: '' } }]);
  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((block) => block.id === active.id);
    const newIndex = blocks.findIndex((block) => block.id === over.id);
    onChange(arrayMove(blocks, oldIndex, newIndex));
  };

  return (
    <div className="grid gap-3">
      <DndContext onDragEnd={onDragEnd}>
        <SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
          {blocks.map((block, index) => (
            <SortableBlock
              key={block.id}
              block={block}
              contentTypes={contentTypes}
              entries={block.props.contentType ? entriesByType[String(block.props.contentType)] ?? [] : []}
              onChange={(next) => onChange(blocks.map((item) => (item.id === block.id ? next : item)))}
              onRemove={() => onChange(blocks.filter((_, blockIndex) => blockIndex !== index))}
              canManageStructure={canManageStructure}
            />
          ))}
        </SortableContext>
      </DndContext>
      {canManageStructure && (
        <button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white sm:w-fit" onClick={addBlock}>
          <Plus size={16} />
          {t('pageBuilder.addBlock')}
        </button>
      )}
    </div>
  );
}
