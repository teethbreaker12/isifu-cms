import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { t } from '../i18n';
import type { ContentField, FieldType, PageBlock } from '../types/cms';
import { DynamicForm } from './DynamicForm';
import { IconButton, InfoTooltip } from './IconButton';
import { SelectField } from './SelectField';

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
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="grid gap-4 rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {canManageStructure && (
            <IconButton label={t('pageBuilder.dragSection')} icon={<GripVertical size={18} />} className="mt-1" {...attributes} {...listeners} />
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600">{t('pageBuilder.section')}</span>
              <span className="min-w-0 truncate text-sm font-semibold text-stone-950">{block.type || 'section'}</span>
            </div>
            <div className="mt-2">
              <InfoTooltip label={t('pageBuilder.sectionHelp')} />
            </div>
          </div>
        </div>
        {canManageStructure && (
          <IconButton label={t('pageBuilder.removeSection')} icon={<Trash2 size={18} />} tone="danger" className="w-full md:w-10" onClick={onRemove} />
        )}
      </div>

      {canManageStructure && (
        <label className="grid gap-1 text-sm font-medium text-stone-700">
          <span>{t('pageBuilder.blockTypeLabel')}</span>
          <input
            className="rounded-md border border-stone-300 px-3 py-2 font-normal"
            placeholder={t('pageBuilder.blockType')}
            value={block.type}
            onChange={(event) => onChange({ ...block, type: normalizeKey(event.target.value) || 'section' })}
          />
        </label>
      )}

      {canManageStructure && (
        <div className="grid gap-3 rounded-md bg-stone-50 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h4 className="text-sm font-semibold text-stone-950">{t('pageBuilder.fieldsTitle')}</h4>
              <p className="mt-1 text-xs leading-5 text-stone-500">{t('pageBuilder.fieldsHelp')}</p>
            </div>
            <button type="button" className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium sm:w-fit" onClick={addField}>
              <Plus size={16} />
              {t('pageBuilder.addField')}
            </button>
          </div>
          <div className="grid gap-3">
            {fields.map((field, index) => (
              <div key={index} className="grid gap-3 rounded-md border border-stone-200 bg-white p-3">
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_200px_44px]">
                  <label className="grid gap-1 text-sm font-medium text-stone-700">
                    <span>{t('pageBuilder.fieldKeyLabel')}</span>
                    <input
                      className="rounded-md border border-stone-300 px-3 py-2 font-normal"
                      placeholder={t('pageBuilder.fieldKey')}
                      value={field.key}
                      onChange={(event) => updateField(index, { key: event.target.value })}
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-medium text-stone-700">
                    <span>{t('pageBuilder.fieldLabelLabel')}</span>
                    <input
                      className="rounded-md border border-stone-300 px-3 py-2 font-normal"
                      placeholder={t('pageBuilder.fieldLabel')}
                      value={field.label}
                      onChange={(event) => updateField(index, { label: event.target.value })}
                    />
                  </label>
                  <div className="grid gap-1 text-sm font-medium text-stone-700">
                    <span>{t('pageBuilder.fieldTypeLabel')}</span>
                    <SelectField
                      value={field.type}
                      options={pageFieldTypes.map((type) => ({ value: type, label: t(`fields.${type}`) }))}
                      onChange={(next) => updateField(index, { type: next as PageFieldType })}
                    />
                  </div>
                  <IconButton label={t('models.removeField')} icon={<Trash2 size={16} />} tone="danger" className="w-full self-end xl:w-10" onClick={() => removeField(index)} />
                </div>
                <InfoTooltip label={t(`fields.help.${field.type}`)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeFields.length > 0 ? (
        <div className="grid gap-3">
          <div>
            <h4 className="text-sm font-semibold text-stone-950">{t('pageBuilder.contentTitle')}</h4>
            <p className="mt-1 text-xs leading-5 text-stone-500">{t('pageBuilder.contentHelp')}</p>
          </div>
          <DynamicForm fields={activeFields} value={values} onChange={setValues} variant="entry" />
        </div>
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
        <button type="button" className="accent-bg inline-flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold sm:w-fit" onClick={addBlock}>
          <Plus size={16} />
          {t('pageBuilder.addSection')}
        </button>
      )}
    </div>
  );
}
