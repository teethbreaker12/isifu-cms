import { useEffect, useState } from 'react';
import { FileText, Folder, FolderInput, FolderPlus, Trash2, Upload, X } from 'lucide-react';
import { api, mediaUrl } from '../api/client';
import { Modal } from '../components/Modal';
import { Panel } from '../components/Panel';
import { useToast } from '../components/Toast';
import { t } from '../i18n';
import type { MediaAsset } from '../types/cms';

const CATALOG_STORAGE_KEY = 'cms_media_catalogs';
const UNCATEGORIZED = '__uncategorized__';

type MediaCatalogState = {
  folders: string[];
  assignments: Record<string, string>;
};

function readCatalogState(): MediaCatalogState {
  try {
    const parsed = JSON.parse(localStorage.getItem(CATALOG_STORAGE_KEY) || '{}') as Partial<MediaCatalogState>;
    return {
      folders: Array.isArray(parsed.folders) ? parsed.folders.filter(Boolean) : [],
      assignments: parsed.assignments && typeof parsed.assignments === 'object' ? parsed.assignments : {},
    };
  } catch {
    return { folders: [], assignments: {} };
  }
}

export function MediaPage() {
  const { notify } = useToast();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<MediaAsset | null>(null);
  const [catalog, setCatalog] = useState<MediaCatalogState>(readCatalogState);
  const [newFolder, setNewFolder] = useState('');
  const [activeFolder, setActiveFolder] = useState('all');
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [deleteAsset, setDeleteAsset] = useState<MediaAsset | null>(null);
  const [moveAsset, setMoveAsset] = useState<MediaAsset | null>(null);
  const [moveFolder, setMoveFolder] = useState(UNCATEGORIZED);

  const load = () => api.media().then(setAssets).catch(() => setAssets([]));

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(catalog));
  }, [catalog]);

  const folderCounts = assets.reduce<Record<string, number>>((counts, asset) => {
    const folder = catalog.assignments[String(asset.id)] || UNCATEGORIZED;
    counts[folder] = (counts[folder] || 0) + 1;
    return counts;
  }, {});

  const visibleAssets = assets.filter((asset) => {
    if (activeFolder === 'all') return true;
    const folder = catalog.assignments[String(asset.id)] || UNCATEGORIZED;
    return folder === activeFolder;
  });

  async function upload(file?: File) {
    if (!file) return;
    try {
      const asset = await api.upload(file);
      setUrl(asset.url);
      await load();
      notify(t('media.uploaded'));
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'Upload failed', 'error');
    }
  }

  async function remove(asset: MediaAsset) {
    try {
      await api.deleteMedia(asset.id);
      setDeleteAsset(null);
      await load();
      notify(t('media.deleted'));
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'Delete failed', 'error');
    }
  }

  function createFolder(event: React.FormEvent) {
    event.preventDefault();
    const folder = newFolder.trim();
    if (!folder || catalog.folders.includes(folder)) return;
    setCatalog((current) => ({
      ...current,
      folders: [...current.folders, folder].sort((a, b) => a.localeCompare(b)),
    }));
    setActiveFolder(folder);
    setNewFolder('');
    setFolderModalOpen(false);
    notify(t('media.folderCreated'));
  }

  function assignFolder(assetId: number, folder: string) {
    setCatalog((current) => {
      const assignments = { ...current.assignments };
      if (!folder || folder === UNCATEGORIZED) {
        delete assignments[String(assetId)];
      } else {
        assignments[String(assetId)] = folder;
      }
      return { ...current, assignments };
    });
    notify(folder === UNCATEGORIZED ? t('media.folderCleared') : t('media.folderAssigned'));
  }

  function openMoveModal(asset: MediaAsset) {
    setMoveAsset(asset);
    setMoveFolder(catalog.assignments[String(asset.id)] || UNCATEGORIZED);
  }

  function moveToFolder(event: React.FormEvent) {
    event.preventDefault();
    if (!moveAsset) return;
    assignFolder(moveAsset.id, moveFolder);
    setMoveAsset(null);
  }

  return (
    <div className="grid gap-5">
      <h1 className="page-title">{t('nav.media')}</h1>
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
          <div className="grid gap-4">
            <div className="grid gap-3 border-b border-stone-200 pb-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: t('media.all'), count: assets.length },
                  { key: UNCATEGORIZED, label: t('media.uncategorized'), count: folderCounts[UNCATEGORIZED] || 0 },
                  ...catalog.folders.map((folder) => ({ key: folder, label: folder, count: folderCounts[folder] || 0 })),
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
              <div className="flex justify-end">
                <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700" onClick={() => setFolderModalOpen(true)}>
                  <FolderPlus size={17} />
                  {t('media.addFolder')}
                </button>
              </div>
            </div>

            {visibleAssets.length === 0 ? (
              <p className="text-sm text-stone-500">{t('media.folderEmpty')}</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {visibleAssets.map((asset) => {
                  const isImage = asset.mimeType.startsWith('image/');
                  const assignedFolder = catalog.assignments[String(asset.id)] || UNCATEGORIZED;
                  const assignedLabel = assignedFolder === UNCATEGORIZED ? t('media.uncategorized') : assignedFolder;
                  return (
                    <div key={asset.id} className="group flex min-h-full min-w-0 flex-col overflow-hidden rounded-md border border-stone-200 bg-white transition hover:border-stone-300 hover:shadow-sm">
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
                      <div className="mt-auto grid gap-2 border-t border-stone-200 p-3">
                        <div className="flex min-w-0 items-center gap-2 rounded-md bg-stone-50 px-2 py-1.5 text-xs text-stone-600">
                          <Folder size={14} />
                          <span className="min-w-0 truncate">{assignedLabel}</span>
                        </div>
                        <button className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50" onClick={() => openMoveModal(asset)}>
                          <FolderInput size={16} />
                          {t('media.moveToFolder')}
                        </button>
                        <button className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50" onClick={() => setDeleteAsset(asset)}>
                          <Trash2 size={16} />
                          {t('common.delete')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
      {folderModalOpen && (
        <Modal
          title={t('media.addFolder')}
          description={t('media.folderModalText')}
          onClose={() => setFolderModalOpen(false)}
        >
          <form className="grid gap-4" onSubmit={createFolder}>
            <input
              className="rounded-md border border-stone-300 px-3 py-2 text-sm"
              value={newFolder}
              onChange={(event) => setNewFolder(event.target.value)}
              placeholder={t('media.folderPlaceholder')}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button type="button" className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700" onClick={() => setFolderModalOpen(false)}>
                {t('common.cancel')}
              </button>
              <button className="accent-bg rounded-md px-3 py-2 text-sm font-semibold">
                {t('media.addFolder')}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleteAsset && (
        <Modal
          title={t('media.deleteTitle')}
          description={deleteAsset.originalName}
          onClose={() => setDeleteAsset(null)}
          footer={
            <>
              <button type="button" className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700" onClick={() => setDeleteAsset(null)}>
                {t('common.cancel')}
              </button>
              <button type="button" className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" onClick={() => void remove(deleteAsset)}>
                {t('common.delete')}
              </button>
            </>
          }
        >
          <p className="text-sm leading-6 text-stone-600">{t('media.deleteConfirm')}</p>
        </Modal>
      )}
      {moveAsset && (
        <Modal
          title={t('media.moveToFolder')}
          description={moveAsset.originalName}
          onClose={() => setMoveAsset(null)}
        >
          <form className="grid gap-4" onSubmit={moveToFolder}>
            <p className="text-sm leading-6 text-stone-600">{t('media.moveFolderText')}</p>
            <select
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700"
              value={moveFolder}
              onChange={(event) => setMoveFolder(event.target.value)}
              autoFocus
            >
              <option value={UNCATEGORIZED}>{t('media.uncategorized')}</option>
              {catalog.folders.map((folder) => (
                <option key={folder} value={folder}>{folder}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button type="button" className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700" onClick={() => setMoveAsset(null)}>
                {t('common.cancel')}
              </button>
              <button className="accent-bg rounded-md px-3 py-2 text-sm font-semibold">
                {t('common.save')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
