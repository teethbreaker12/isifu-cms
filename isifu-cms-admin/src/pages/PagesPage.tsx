import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { api } from '../api/client';
import { isAdmin } from '../auth';
import { Modal } from '../components/Modal';
import { PageBuilder } from '../components/PageBuilder';
import { Panel } from '../components/Panel';
import { useToast } from '../components/Toast';
import { t } from '../i18n';
import type { Page, PageBlock } from '../types/cms';

export function PagesPage() {
  const { notify } = useToast();
  const [pages, setPages] = useState<Page[]>([]);
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [creatingPage, setCreatingPage] = useState(false);
  const [deletePage, setDeletePage] = useState<Page | null>(null);
  const admin = isAdmin();
  const isEditing = creatingPage || Boolean(editingSlug);

  const load = () => api.pages().then(setPages);
  useEffect(() => void load(), []);

  async function save(nextPublished: boolean) {
    try {
      if (editingSlug) {
        await api.updatePage(editingSlug, { slug, title, seoTitle, seoDescription, blocks, published: nextPublished });
      } else if (admin) {
        await api.createPage({ slug, title, seoTitle, seoDescription, blocks, published: nextPublished });
      }
      resetForm();
      await load();
      notify(nextPublished ? t('pages.published') : t('pages.saved'));
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'Save failed', 'error');
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    void save(false);
  }

  function startCreate() {
    setSlug('');
    setTitle('');
    setSeoTitle('');
    setSeoDescription('');
    setBlocks([]);
    setEditingSlug(null);
    setCreatingPage(true);
  }

  function edit(page: Page) {
    setEditingSlug(page.slug);
    setCreatingPage(false);
    setSlug(page.slug);
    setTitle(page.title);
    setSeoTitle(page.seoTitle ?? '');
    setSeoDescription(page.seoDescription ?? '');
    setBlocks(page.blocks ?? []);
  }

  function resetForm() {
    setSlug('');
    setTitle('');
    setSeoTitle('');
    setSeoDescription('');
    setBlocks([]);
    setEditingSlug(null);
    setCreatingPage(false);
  }

  async function remove(page: Page) {
    try {
      await api.deletePage(page.slug);
      setDeletePage(null);
      if (editingSlug === page.slug) resetForm();
      await load();
      notify(t('pages.deleted'));
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'Delete failed', 'error');
    }
  }

  return (
    <div className="grid gap-5">
      <h1 className="page-title">{t('pages.title')}</h1>
      <Panel
        title={t('pages.editor')}
        action={
          isEditing ? (
            <button type="button" className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm" onClick={resetForm}>
              <X size={16} />
              {t('common.cancel')}
            </button>
          ) : admin ? (
            <button type="button" className="inline-flex items-center gap-2 rounded-md bg-stone-950 px-3 py-2 text-sm font-medium text-white" onClick={startCreate}>
              <Plus size={16} />
              {t('pages.new')}
            </button>
          ) : null
        }
      >
        {!isEditing ? (
          <p className="text-sm leading-6 text-stone-600">{t('pages.editorHint')}</p>
        ) : (
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-3 lg:grid-cols-2">
            <input className="rounded-md border border-stone-300 px-3 py-2" placeholder={t('pages.slug')} value={slug} onChange={(event) => setSlug(event.target.value)} />
            <input className="rounded-md border border-stone-300 px-3 py-2" placeholder={t('pages.titlePlaceholder')} value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <input className="rounded-md border border-stone-300 px-3 py-2" placeholder={t('pages.seoTitle')} value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} />
          <textarea className="min-h-20 rounded-md border border-stone-300 px-3 py-2" placeholder={t('pages.seoDescription')} value={seoDescription} onChange={(event) => setSeoDescription(event.target.value)} />
          <PageBuilder blocks={blocks} onChange={setBlocks} canManageStructure={admin} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="submit" className="w-full rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800 sm:w-fit">
              {t('common.saveDraft')}
            </button>
            <button type="button" className="w-full rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white sm:w-fit" onClick={() => void save(true)}>
              {t('common.publish')}
            </button>
          </div>
        </form>
        )}
      </Panel>
      <Panel title={t('pages.title')}>
        <div className="grid gap-3">
          {pages.map((page) => (
            <div key={page.id} className="flex flex-col gap-3 rounded-md border border-stone-200 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-semibold text-stone-950">{page.title}</div>
                <div className="text-sm text-stone-500">/{page.slug} - {page.published ? 'published' : 'draft'}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm" onClick={() => edit(page)}>
                  <Pencil size={16} />
                  {t('common.edit')}
                </button>
                <button className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50" onClick={() => setDeletePage(page)}>
                  <Trash2 size={16} />
                  {t('common.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Panel>
      {deletePage && (
        <Modal
          title={t('pages.deleteTitle')}
          description={`/${deletePage.slug}`}
          onClose={() => setDeletePage(null)}
          footer={
            <>
              <button type="button" className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700" onClick={() => setDeletePage(null)}>
                {t('common.cancel')}
              </button>
              <button type="button" className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" onClick={() => void remove(deletePage)}>
                {t('common.delete')}
              </button>
            </>
          }
        >
          <p className="text-sm leading-6 text-stone-600">{t('pages.deleteConfirm')}</p>
        </Modal>
      )}
    </div>
  );
}
