import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { t } from '../i18n';
import type { ContentField, FieldType, PageBlock } from '../types/cms';
import { DynamicForm } from './DynamicForm';

type PageFieldType = Extract<FieldType, 'text' | 'richtext' | 'textarea' | 'image' | 'date'>;
type PageField = Pick<ContentField, 'label' | 'key' | 'type' | 'required'>;

const pageFieldTypes: PageFieldType[] = ['text', 'richtext', 'textarea', 'image', 'date'];
const schemaKey = '_fields';

function isPageFieldType(type: unknown): type is PageFieldType {
  return typeof type === 'string' && pageFieldTypes.includes(type as PageFieldType);
}

function normalizeKey(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_+/, '');
}

function readFields(props: Record<string, unknown>): PageField[] {
  const stored = props[schemaKey];
  if (Array.isArray(stored)) {
    return stored
      .map((field) => {
        if (!field || typeof field !== 'object') return null;
        const item = field as Record<string, unknown>;
        const key = typeof item.key === 'string' ? item.key : '';
        const type = isPageFieldType(item.type) ? item.type : 'text';
        return {
          key,
          label: typeof item.label === 'string' && item.label ? item.label : key,
          type,
          required: item.required !== false,
        };
      })
      .filter(Boolean) as PageField[];
  }

  return Object.keys(props)
    .filter((key) => key !== schemaKey)
    .map((key) => ({
      key,
      label: key,
      type: key.toLowerCase().includes('image') ? 'image' : key.toLowerCase().includes('date') ? 'date' : 'text',
      required: true,
    }));
}

function saveFields(props: Record<string, unknown>, fields: PageField[]) {
  return { ...props, [schemaKey]: fields };
}

function SortableBlock({
  block,
  onChange,
  onRemove,
  canManageStructure,
}: {
  block: PageBlock;
  onChange: (block: PageBlock) => void;
  onRemove: () => void;
  canManageStructure: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id, disabled: !canManageStructure });
  const fields = readFields(block.props);
  const activeFields = fields.filter((field) => field.key);
  const values = Object.fromEntries(activeFields.map((field) => [field.key, block.props[field.key]]));

  const setFields = (nextFields: PageField[]) => {
    const nextProps: Record<string, unknown> = {};
    for (const field of nextFields) {
      if (field.key) nextProps[field.key] = block.props[field.key] ?? '';
    }
    onChange({ ...block, props: saveFields(nextProps, nextFields) });
  };

  const updateField = (index: number, patch: Partial<PageField>) => {
    const nextFields = fields.map((field, fieldIndex) => {
      if (fieldIndex !== index) return field;
      return {
        ...field,
        ...patch,
        label: patch.label !== undefined ? patch.label : field.label,
      };
    });

    if (patch.key !== undefined) {
      const oldKey = fields[index]?.key;
      const newKey = normalizeKey(nextFields[index]?.key ?? '');
      if (!oldKey && newKey) {
        nextFields[index] = { ...nextFields[index], key: newKey };
        onChange({ ...block, props: saveFields({ ...block.props, [newKey]: block.props[newKey] ?? '' }, nextFields) });
        return;
      }
      if (oldKey && newKey && oldKey !== newKey) {
        nextFields[index] = { ...nextFields[index], key: newKey };
        const nextProps = { ...block.props };
        nextProps[newKey] = nextProps[oldKey] ?? '';
        delete nextProps[oldKey];
        onChange({ ...block, props: saveFields(nextProps, nextFields) });
        return;
      }
      if (oldKey && !newKey) {
        nextFields[index] = { ...nextFields[index], key: patch.key ?? '' };
      }
    }

    onChange({ ...block, props: saveFields(block.props, nextFields) });
  };

  const addField = () => {
    setFields([...fields, { key: '', label: '', type: 'text', required: true }]);
  };

  const removeField = (index: number) => {
    const key = fields[index]?.key;
    const nextProps = { ...block.props };
    if (key) delete nextProps[key];
    onChange({ ...block, props: saveFields(nextProps, fields.filter((_, fieldIndex) => fieldIndex !== index)) });
  };

  const setValues = (nextValues: Record<string, unknown>) => {
    onChange({ ...block, props: { ...block.props, ...nextValues, [schemaKey]: fields } });
  };

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="rounded-md border border-stone-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        {canManageStructure && (
          <button type="button" className="rounded p-1 text-stone-500 hover:bg-stone-100" {...attributes} {...listeners} aria-label="Drag block">
            <GripVertical size={18} />
          </button>
        )}
        {canManageStructure ? (
          <input
            className="min-w-0 flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm"
            placeholder={t('pageBuilder.blockType')}
            value={block.type}
            onChange={(event) => onChange({ ...block, type: normalizeKey(event.target.value) || 'section' })}
          />
        ) : (
          <div className="mr-auto rounded-md bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600">{block.type}</div>
        )}
        {canManageStructure && (
          <button type="button" className="rounded p-1 text-red-600 hover:bg-red-50" onClick={onRemove} aria-label="Remove block">
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {canManageStructure && (
        <div className="mb-4 grid gap-3 rounded-md bg-stone-50 p-3">
          {fields.map((field, index) => (
            <div key={index} className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px_44px]">
              <input
                className="rounded-md border border-stone-300 px-3 py-2 text-sm"
                placeholder={t('pageBuilder.fieldKey')}
                value={field.key}
                onChange={(event) => updateField(index, { key: event.target.value })}
              />
              <input
                className="rounded-md border border-stone-300 px-3 py-2 text-sm"
                placeholder={t('pageBuilder.fieldLabel')}
                value={field.label}
                onChange={(event) => updateField(index, { label: event.target.value })}
              />
              <select
                className="rounded-md border border-stone-300 px-3 py-2 text-sm"
                value={field.type}
                onChange={(event) => updateField(index, { type: event.target.value as PageFieldType })}
              >
                {pageFieldTypes.map((type) => <option key={type} value={type}>{t(`fields.${type}`)}</option>)}
              </select>
              <button type="button" className="grid h-10 w-full place-items-center rounded-md border border-red-200 text-red-700 hover:bg-red-50 lg:w-10" onClick={() => removeField(index)}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button type="button" className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm sm:w-fit" onClick={addField}>
            <Plus size={16} />
            {t('pageBuilder.addField')}
          </button>
        </div>
      )}

      {activeFields.length > 0 ? (
        <DynamicForm fields={activeFields} value={values} onChange={setValues} />
      ) : (
        <p className="text-sm text-stone-500">{t('pageBuilder.noFields')}</p>
      )}
    </div>
  );
}

export function PageBuilder({ blocks, onChange, canManageStructure = true }: { blocks: PageBlock[]; onChange: (blocks: PageBlock[]) => void; canManageStructure?: boolean }) {
  const addBlock = () => onChange([...blocks, { id: crypto.randomUUID(), type: 'section', props: saveFields({}, [{ key: '', label: '', type: 'text', required: true }]) }]);
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
              onChange={(next) => onChange(blocks.map((item) => (item.id === block.id ? next : item)))}
              onRemove={() => onChange(blocks.filter((_, blockIndex) => blockIndex !== index))}
              canManageStructure={canManageStructure}
            />
          ))}
        </SortableContext>
      </DndContext>
      {canManageStructure && (
        <button type="button" className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white sm:w-fit" onClick={addBlock}>
          <Plus size={16} />
          {t('pageBuilder.addSection')}
        </button>
      )}
    </div>
  );
}
