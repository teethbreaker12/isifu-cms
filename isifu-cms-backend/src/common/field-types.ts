export const FIELD_TYPES = ['text', 'textarea', 'richtext', 'image', 'lucideIcon', 'boolean', 'date', 'repeater'] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export function columnTypeForField(type: FieldType): string {
  switch (type) {
    case 'text':
    case 'lucideIcon':
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
  if (type === 'date') return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  return value ?? null;
}
