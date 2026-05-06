import { useEffect, useState } from 'react';
import { FileText, Trash2, Upload, X } from 'lucide-react';
import { api, mediaUrl } from '../api/client';
import { Panel } from '../components/Panel';
import { t } from '../i18n';
import type { MediaAsset } from '../types/cms';

export function MediaPage() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<MediaAsset | null>(null);

  const load = () => api.media().then(setAssets).catch(() => setAssets([]));

  useEffect(() => {
    void load();
  }, []);

  async function upload(file?: File) {
    if (!file) return;
    const asset = await api.upload(file);
    setUrl(asset.url);
    await load();
  }

  async function remove(asset: MediaAsset) {
    if (!window.confirm(t('media.deleteConfirm'))) return;
    await api.deleteMedia(asset.id);
    await load();
  }

  return (
    <div className="grid gap-5">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-950">{t('nav.media')}</h1>
      <Panel title={t('media.upload')}>
        <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white sm:w-fit">
          <Upload size={16} />
          {t('media.upload')}
          <input type="file" className="hidden" onChange={(event) => upload(event.target.files?.[0])} />
        </label>
        {url && <p className="mt-4 break-all rounded-md bg-stone-100 px-3 py-2 text-sm text-stone-700">{url}</p>}
      </Panel>
      <Panel title={t('media.gallery')}>
        {assets.length === 0 ? (
          <p className="text-sm text-stone-500">{t('media.empty')}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {assets.map((asset) => {
              const isImage = asset.mimeType.startsWith('image/');
              return (
                <div key={asset.id} className="group flex min-h-full min-w-0 flex-col overflow-hidden rounded-md border border-stone-200 bg-white transition hover:border-blue-500 hover:shadow-sm">
                  <button type="button" className="min-w-0 text-left" onClick={() => setPreview(asset)}>
                  <div className="grid aspect-video place-items-center bg-stone-100">
                    {isImage ? (
                      <img src={mediaUrl(asset.url)} alt={asset.originalName} className="h-full w-full object-cover" />
                    ) : (
                      <FileText className="text-stone-500" size={34} />
                    )}
                  </div>
                  <div className="grid gap-1 p-3">
                    <div className="truncate text-sm font-semibold text-stone-950">{asset.originalName}</div>
                    <div className="text-xs text-stone-500">{asset.mimeType} - {Math.round(asset.size / 1024)} KB</div>
                    <div className="truncate text-xs text-stone-500">{asset.url}</div>
                  </div>
                  </button>
                  <div className="mt-auto border-t border-stone-200 p-3">
                    <button className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50" onClick={() => remove(asset)}>
                      <Trash2 size={16} />
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
      {preview && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setPreview(null)}>
          <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-lg border border-stone-200 bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
              <div className="min-w-0 pr-3">
                <div className="truncate text-sm font-semibold text-stone-950">{preview.originalName}</div>
                <div className="text-xs text-stone-500">{preview.mimeType} - {Math.round(preview.size / 1024)} KB</div>
              </div>
              <button type="button" className="rounded-md p-2 text-stone-600 hover:bg-stone-100 hover:text-stone-950" onClick={() => setPreview(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="grid max-h-[75vh] place-items-center overflow-auto bg-stone-100 p-4">
              {preview.mimeType.startsWith('image/') ? (
                <img src={mediaUrl(preview.url)} alt={preview.originalName} className="max-h-[70vh] max-w-full rounded object-contain" />
              ) : preview.mimeType === 'application/pdf' ? (
                <iframe src={mediaUrl(preview.url)} title={preview.originalName} className="h-[70vh] w-full rounded bg-white" />
              ) : (
                <div className="grid gap-3 text-center text-stone-600">
                  <FileText className="mx-auto" size={44} />
                  <div>{preview.originalName}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
