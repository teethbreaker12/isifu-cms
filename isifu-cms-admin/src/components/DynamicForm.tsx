import type { ContentField } from '../types/cms';
import { t } from '../i18n';
import { InfoTooltip } from './IconButton';
import { LucideIconField } from './LucideIconField';
import { MediaPicker } from './MediaPicker';
import { RichTextEditor } from './RichTextEditor';
import { SelectField } from './SelectField';

type Props = {
  fields: ContentField[];
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  variant?: 'default' | 'entry';
};

type SelectOption = {
  value: string;
  label: string;
};

function selectOptions(field: ContentField): SelectOption[] {
  const options = field.settings?.options;
  if (Array.isArray(options)) {
    return options
      .map((option) => {
        if (typeof option === 'string') return parseSelectOption(option);
        if (option && typeof option === 'object') {
          const record = option as Record<string, unknown>;
          const value = typeof record.value === 'string' ? record.value.trim() : '';
          const label = typeof record.label === 'string' ? record.label.trim() : value;
          if (value) return { value, label: label || value };
        }
        return null;
      })
      .filter((option): option is SelectOption => Boolean(option));
  }
  if (typeof options === 'string') {
    return options.split(/\r?\n|,/).map(parseSelectOption).filter((option): option is SelectOption => Boolean(option));
  }
  return [];
}

function parseSelectOption(option: string): SelectOption | null {
  const [rawValue, ...rawLabelParts] = option.split('|');
  const value = rawValue.trim();
  const label = rawLabelParts.join('|').trim() || value;
  return value ? { value, label } : null;
}

function FieldControl({
  field,
  fieldValue,
  options,
  onChange,
  showBooleanLabel = false,
}: {
  field: ContentField;
  fieldValue: unknown;
  options: SelectOption[];
  onChange: (next: unknown) => void;
  showBooleanLabel?: boolean;
}) {
  if (field.type === 'textarea') {
    return (
      <textarea
        className="min-h-28 rounded-md border border-stone-300 px-3 py-2 font-normal leading-6 focus-ring"
        placeholder={field.label}
        value={String(fieldValue ?? '')}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (field.type === 'richtext') {
    return <RichTextEditor value={String(fieldValue ?? '')} onChange={onChange} />;
  }

  if (field.type === 'image') {
    return (
      <MediaPicker
        value={(field.settings?.multiple ? fieldValue : String(fieldValue ?? '')) as string | string[]}
        multiple={Boolean(field.settings?.multiple)}
        maxItems={Number(field.settings?.maxItems || 0)}
        onChange={onChange}
      />
    );
  }

  if (field.type === 'lucideIcon') {
    return <LucideIconField value={String(fieldValue ?? '')} onChange={onChange} />;
  }

  if (field.type === 'boolean') {
    return (
      <label className="flex min-h-10 items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-medium text-stone-700">
        <input
          type="checkbox"
          className="h-5 w-5 rounded border-stone-300"
          checked={Boolean(fieldValue)}
          onChange={(event) => onChange(event.target.checked)}
        />
        {showBooleanLabel && field.label}
      </label>
    );
  }

  if (field.type === 'date') {
    return (
      <input
        type="date"
        className="rounded-md border border-stone-300 px-3 py-2 font-normal focus-ring"
        aria-label={field.label}
        value={String(fieldValue ?? '')}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (field.type === 'select') {
    return (
      <SelectField
        buttonClassName="font-normal"
        value={String(fieldValue ?? '')}
        options={[{ value: '', label: '' }, ...options]}
        onChange={onChange}
        ariaLabel={field.label}
      />
    );
  }

  if (field.type === 'repeater') {
    return (
      <textarea
        className="min-h-24 rounded-md border border-stone-300 px-3 py-2 font-mono text-xs font-normal focus-ring"
        placeholder="[]"
        value={JSON.stringify(fieldValue ?? [], null, 2)}
        onChange={(event) => {
          try {
            onChange(JSON.parse(event.target.value));
          } catch {
            onChange(event.target.value);
          }
        }}
      />
    );
  }

  return (
    <input
      className="rounded-md border border-stone-300 px-3 py-2 font-normal focus-ring"
      placeholder={field.label}
      value={String(fieldValue ?? '')}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function DynamicForm({ fields, value, onChange, variant = 'default' }: Props) {
  const setField = (key: string, next: unknown) => onChange({ ...value, [key]: next });

  return (
    <div className={variant === 'entry' ? 'grid gap-3' : 'grid gap-4'}>
      {fields.map((field) => {
        const options = field.type === 'select' ? selectOptions(field) : [];

        if (variant !== 'entry') {
          return (
            <div key={field.key} className="grid gap-1 text-sm font-medium text-stone-700">
              <span>{field.label}</span>
              <FieldControl field={field} fieldValue={value[field.key]} options={options} onChange={(next) => setField(field.key, next)} />
            </div>
          );
        }

        return (
          <div key={field.key} className="grid gap-3 rounded-lg border border-stone-200 bg-white p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 truncate text-sm font-semibold text-stone-950">{field.label}</span>
                  <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600">{t(`fields.${field.type}`)}</span>
                  {field.required && (
                    <span className="rounded-md border border-stone-200 px-2 py-1 text-xs font-medium text-stone-600">
                      {t('common.required')}
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <InfoTooltip label={t(`fields.help.${field.type}`)} />
                </div>
              </div>
              <span className="max-w-full truncate rounded-md bg-stone-50 px-2 py-1 font-mono text-xs text-stone-500">
                {field.key}
              </span>
            </div>
            <FieldControl field={field} fieldValue={value[field.key]} options={options} onChange={(next) => setField(field.key, next)} showBooleanLabel />
          </div>
        );
      })}
    </div>
  );
}
