import { Image as ImageIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, mediaUrl } from '../api/client';
import { t } from '../i18n';
import type { MediaAsset } from '../types/cms';

export function MediaPicker({
  value,
  onChange,
  multiple = false,
  maxItems,
}: {
  value?: string | string[];
  onChange: (url: string | string[]) => void;
  multiple?: boolean;
  maxItems?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const limit = maxItems && maxItems > 0 ? maxItems : undefined;
  const canAddMore = !limit || values.length < limit;

  useEffect(() => {
    if (isOpen) api.media().then(setAssets).catch(() => setAssets([]));
  }, [isOpen]);

  return (
    <div className="grid gap-2">
      {values.length > 0 && (
        <div className="grid gap-2">
          {values.map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-md border border-stone-200 bg-stone-50 p-2">
              <img src={mediaUrl(item)} alt="" className="h-14 w-20 rounded object-cover" />
              <div className="min-w-0 flex-1 text-xs text-stone-500">
                <div className="font-medium text-stone-700">{t('media.selected')}</div>
                <div className="truncate">{item}</div>
              </div>
              {multiple && (
                <button
                  type="button"
                  className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                  onClick={() => onChange(values.filter((url) => url !== item))}
                >
                  {t('common.delete')}
                </button>
              )}
            </div>
          ))}
          {limit && <div className="text-xs text-stone-500">{values.length}/{limit}</div>}
          </div>
      )}
      <button
        type="button"
        className="inline-flex w-fit items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
        onClick={() => setIsOpen(true)}
      >
        <ImageIcon size={16} />
        {t('media.choose')}
      </button>
      {multiple ? (
        <textarea
          className="min-h-20 rounded-md border border-stone-300 px-3 py-2 font-normal focus-ring"
          value={values.join('\n')}
          onChange={(event) => onChange(event.target.value.split('\n').map((item) => item.trim()).filter(Boolean).slice(0, limit))}
          placeholder="/api/uploads/image.jpg"
        />
      ) : (
        <input
          className="rounded-md border border-stone-300 px-3 py-2 font-normal focus-ring"
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
          placeholder="/api/uploads/image.jpg"
        />
      )}
      {isOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setIsOpen(false)}>
          <div className="max-h-[80vh] w-full max-w-4xl overflow-auto rounded-lg border border-stone-200 bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-stone-950">{t('nav.media')}</h3>
              <button type="button" className="rounded-md border border-stone-300 px-3 py-1 text-sm" onClick={() => setIsOpen(false)}>
                {t('common.cancel')}
              </button>
            </div>
            {assets.length === 0 ? (
              <p className="text-sm text-stone-500">{t('media.empty')}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    className="overflow-hidden rounded-md border border-stone-200 text-left hover:border-blue-500"
                    disabled={multiple && values.includes(asset.url)}
                    onClick={() => {
                      if (multiple) {
                        if (!values.includes(asset.url) && canAddMore) {
                          onChange([...values, asset.url]);
                        }
                        if (!canAddMore) setIsOpen(false);
                      } else {
                        onChange(asset.url);
                        setIsOpen(false);
                      }
                    }}
                  >
                    <img src={mediaUrl(asset.url)} alt={asset.originalName} className="aspect-video w-full object-cover" />
                    <div className="truncate px-2 py-2 text-xs text-stone-600">{asset.originalName}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
