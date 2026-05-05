import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { t } from '../i18n';

type Props = {
  value: string;
  onChange: (next: string) => void;
};

const iconNames = Object.keys(LucideIcons).filter((name) => /^[A-Z]/.test(name) && name !== 'Icon' && !name.endsWith('Icon'));
const icons = LucideIcons as unknown as Record<string, LucideIcon | undefined>;

export function LucideIconField({ value, onChange }: Props) {
  const PreviewIcon = value ? icons[value] : undefined;

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-stone-300 bg-stone-50 text-stone-700">
          {PreviewIcon ? <PreviewIcon size={20} strokeWidth={1.8} /> : <span className="text-xs text-stone-400">Aa</span>}
        </div>
        <input
          className="min-w-0 flex-1 rounded-md border border-stone-300 px-3 py-2 font-normal focus-ring"
          list="lucide-icon-options"
          placeholder={t('fields.lucideIconPlaceholder')}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {value && !PreviewIcon && <div className="text-xs font-normal text-red-600">{t('fields.lucideIconInvalid')}</div>}
      <datalist id="lucide-icon-options">
        {iconNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </div>
  );
}
