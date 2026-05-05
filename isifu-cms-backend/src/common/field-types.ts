export const FIELD_TYPES = ['text', 'textarea', 'richtext', 'image', 'boolean', 'repeater'] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export function columnTypeForField(type: FieldType): string {
  switch (type) {
    case 'text':
      return 'VARCHAR(512) NULL';
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
  return value ?? null;
}
