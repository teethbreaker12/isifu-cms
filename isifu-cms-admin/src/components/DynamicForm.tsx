import type { ContentField } from '../types/cms';
import { LucideIconField } from './LucideIconField';
import { MediaPicker } from './MediaPicker';
import { RichTextEditor } from './RichTextEditor';

type Props = {
  fields: ContentField[];
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
};

export function DynamicForm({ fields, value, onChange }: Props) {
  const setField = (key: string, next: unknown) => onChange({ ...value, [key]: next });

  return (
    <div className="grid gap-4">
      {fields.map((field) => (
        <div key={field.key} className="grid gap-1 text-sm font-medium text-stone-700">
          <span>{field.label}</span>
          {field.type === 'textarea' ? (
            <textarea
              className="min-h-28 rounded-md border border-stone-300 px-3 py-2 font-normal leading-6 focus-ring"
              value={String(value[field.key] ?? '')}
              onChange={(event) => setField(field.key, event.target.value)}
            />
          ) : field.type === 'richtext' ? (
            <RichTextEditor value={String(value[field.key] ?? '')} onChange={(next) => setField(field.key, next)} />
          ) : field.type === 'image' ? (
            <MediaPicker
              value={(field.settings?.multiple ? value[field.key] : String(value[field.key] ?? '')) as string | string[]}
              multiple={Boolean(field.settings?.multiple)}
              maxItems={Number(field.settings?.maxItems || 0)}
              onChange={(next) => setField(field.key, next)}
            />
          ) : field.type === 'lucideIcon' ? (
            <LucideIconField value={String(value[field.key] ?? '')} onChange={(next) => setField(field.key, next)} />
          ) : field.type === 'boolean' ? (
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-stone-300"
              checked={Boolean(value[field.key])}
              onChange={(event) => setField(field.key, event.target.checked)}
            />
          ) : field.type === 'repeater' ? (
            <textarea
              className="min-h-24 rounded-md border border-stone-300 px-3 py-2 font-mono text-xs font-normal focus-ring"
              value={JSON.stringify(value[field.key] ?? [], null, 2)}
              onChange={(event) => {
                try {
                  setField(field.key, JSON.parse(event.target.value));
                } catch {
                  setField(field.key, event.target.value);
                }
              }}
            />
          ) : (
            <input
              className="rounded-md border border-stone-300 px-3 py-2 font-normal focus-ring"
              value={String(value[field.key] ?? '')}
              onChange={(event) => setField(field.key, event.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
