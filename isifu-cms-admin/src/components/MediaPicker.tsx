import { Folder, Image as ImageIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, mediaUrl } from '../api/client';
import { t } from '../i18n';
import type { MediaAsset, MediaFolder } from '../types/cms';

const UNCATEGORIZED = '__uncategorized__';

function mediaLabel(asset: MediaAsset) {
  return asset.displayName?.trim() || asset.originalName;
}

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
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [activeFolder, setActiveFolder] = useState('all');
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const limit = maxItems && maxItems > 0 ? maxItems : undefined;
  const canAddMore = !limit || values.length < limit;

  useEffect(() => {
    if (!isOpen) return;
    api.media().then(setAssets).catch(() => setAssets([]));
    api.mediaFolders().then(setFolders).catch(() => setFolders([]));
  }, [isOpen]);

  const folderCounts = assets.reduce<Record<string, number>>((counts, asset) => {
    const folder = asset.folderId ? String(asset.folderId) : UNCATEGORIZED;
    counts[folder] = (counts[folder] || 0) + 1;
    return counts;
  }, {});

  const visibleAssets = assets.filter((asset) => {
    if (activeFolder === 'all') return true;
    const folder = asset.folderId ? String(asset.folderId) : UNCATEGORIZED;
    return folder === activeFolder;
  });

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
        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 sm:w-fit"
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
          placeholder={t('media.urlsPlaceholder')}
        />
      ) : (
        <input
          className="rounded-md border border-stone-300 px-3 py-2 font-normal focus-ring"
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t('media.urlPlaceholder')}
        />
      )}
      {isOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setIsOpen(false)}>
          <div className="max-h-[80vh] w-full max-w-5xl overflow-auto rounded-lg border border-stone-200 bg-white p-4 shadow-xl sm:p-5" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-stone-950">{t('nav.media')}</h3>
              <button type="button" className="rounded-md border border-stone-300 px-3 py-1 text-sm" onClick={() => setIsOpen(false)}>
                {t('common.cancel')}
              </button>
            </div>
            {assets.length === 0 ? (
              <p className="text-sm text-stone-500">{t('media.empty')}</p>
            ) : (
              <div className="grid gap-4">
                <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3">
                  {[
                    { key: 'all', label: t('media.all'), count: assets.length },
                    { key: UNCATEGORIZED, label: t('media.uncategorized'), count: folderCounts[UNCATEGORIZED] || 0 },
                    ...folders.map((folder) => ({ key: String(folder.id), label: folder.name, count: folderCounts[String(folder.id)] || 0 })),
                  ].map((folder) => (
                    <button
                      key={folder.key}
                      type="button"
                      className={`inline-flex min-h-9 items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium ${
                        activeFolder === folder.key ? 'accent-soft' : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                      }`}
                      onClick={() => setActiveFolder(folder.key)}
                    >
                      <Folder size={15} />
                      <span className="max-w-36 truncate">{folder.label}</span>
                      <span className="metric-value text-xs opacity-70">{folder.count}</span>
                    </button>
                  ))}
                </div>
                {visibleAssets.length === 0 ? (
                  <p className="text-sm text-stone-500">{t('media.folderEmpty')}</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {visibleAssets.map((asset) => {
                      const label = mediaLabel(asset);
                      return (
                        <button
                          key={asset.id}
                          type="button"
                          className="overflow-hidden rounded-md border border-stone-200 text-left hover:border-blue-500 disabled:opacity-50"
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
                          <img src={mediaUrl(asset.url)} alt={label} className="aspect-video w-full object-cover" />
                          <div className="px-2 py-2">
                            <div className="truncate text-xs font-semibold text-stone-700" title={label}>{label}</div>
                            <div className="mt-1 truncate text-[11px] text-stone-500" title={asset.url}>{asset.url}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
