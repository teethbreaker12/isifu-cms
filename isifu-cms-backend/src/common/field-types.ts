export const FIELD_TYPES = ['text', 'textarea', 'richtext', 'image', 'lucideIcon', 'boolean', 'date', 'select', 'repeater'] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export function columnTypeForField(type: FieldType): string {
  switch (type) {
    case 'text':
    case 'lucideIcon':
    case 'select':
      return 'VARCHAR(512) NULL';
    case 'date':
      return 'DATE NULL';
    case 'image':
      return 'JSON NULL';
    case 'textarea':
    case 'richtext':
    case 'repeater':
      return 'JSON NULL';
    case 'boolean':
      return 'BOOLEAN NOT NULL DEFAULT false';
    default:
      return 'JSON NULL';
  }
}

export function normalizeFieldValue(type: FieldType, value: unknown) {
  if (type === 'boolean') return Boolean(value);
  if (type === 'repeater') return Array.isArray(value) ? value : [];
  if (type === 'textarea' || type === 'richtext') return typeof value === 'object' ? value : value ?? null;
  if (type === 'lucideIcon') return typeof value === 'string' ? value : null;
  if (type === 'select') return typeof value === 'string' && value.trim() ? value : null;
  if (type === 'date') return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  return value ?? null;
}

export type SelectOption = {
  value: string;
  label: string;
};

export function parseSelectOptions(settings: Record<string, unknown> | null | undefined): SelectOption[] {
  const options = settings?.options;
  if (Array.isArray(options)) {
    return options
      .map((option) => {
        if (typeof option === 'string') return parseSelectOptionLine(option);
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
    return options
      .split(/\r?\n|,/)
      .map(parseSelectOptionLine)
      .filter((option): option is SelectOption => Boolean(option));
  }
  return [];
}

function parseSelectOptionLine(option: string): SelectOption | null {
  const [rawValue, ...rawLabelParts] = option.split('|');
  const value = rawValue.trim();
  const label = rawLabelParts.join('|').trim() || value;
  return value ? { value, label } : null;
}
