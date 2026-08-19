import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { api } from '../api/client';
import { isAdmin } from '../auth';
import { IconButton } from '../components/IconButton';
import { Modal } from '../components/Modal';
import { PageBuilder } from '../components/PageBuilder';
import { Panel } from '../components/Panel';
import { PublishActions, StatusBadge, StatusSummary } from '../components/PublishControls';
import { useToast } from '../components/Toast';
import { t } from '../i18n';
import type { Page, PageBlock, PublishStatus } from '../types/cms';

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
  const currentStatus: PublishStatus = pages.find((page) => page.slug === editingSlug)?.published ? 'published' : 'draft';

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

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    void save(submitter?.value === 'publish');
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
      <div>
        <h1 className="page-title">{t('pages.title')}</h1>
        <p className="page-subtitle mt-1">{t('pages.subtitle')}</p>
      </div>
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
        <form className="grid gap-5" onSubmit={submit}>
          <section className="grid gap-3 rounded-lg border border-stone-200 bg-stone-50/70 p-4">
            <div>
              <h3 className="text-sm font-semibold text-stone-950">{t('pages.metaTitle')}</h3>
              <p className="mt-1 text-xs leading-5 text-stone-500">{t('pages.metaHelp')}</p>
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_280px]">
              <label className="grid gap-1 text-sm font-medium text-stone-700">
                <span>{t('pages.slugLabel')}</span>
                <input className="rounded-md border border-stone-300 px-3 py-2 font-normal" placeholder={t('pages.slug')} value={slug} onChange={(event) => setSlug(event.target.value)} />
              </label>
              <label className="grid gap-1 text-sm font-medium text-stone-700">
                <span>{t('pages.titleLabel')}</span>
                <input className="rounded-md border border-stone-300 px-3 py-2 font-normal" placeholder={t('pages.titlePlaceholder')} value={title} onChange={(event) => setTitle(event.target.value)} />
              </label>
              <div className="grid gap-1 text-sm font-medium text-stone-700">
                <span>{t('common.status')}</span>
                <StatusSummary status={currentStatus} />
              </div>
            </div>
          </section>

          <section className="grid gap-3 rounded-lg border border-stone-200 bg-stone-50/70 p-4">
            <div>
              <h3 className="text-sm font-semibold text-stone-950">{t('pages.seoSectionTitle')}</h3>
              <p className="mt-1 text-xs leading-5 text-stone-500">{t('pages.seoHelp')}</p>
            </div>
            <label className="grid gap-1 text-sm font-medium text-stone-700">
              <span>{t('pages.seoTitleLabel')}</span>
              <input className="rounded-md border border-stone-300 px-3 py-2 font-normal" placeholder={t('pages.seoTitle')} value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-medium text-stone-700">
              <span>{t('pages.seoDescriptionLabel')}</span>
              <textarea className="min-h-24 rounded-md border border-stone-300 px-3 py-2 font-normal leading-6" placeholder={t('pages.seoDescription')} value={seoDescription} onChange={(event) => setSeoDescription(event.target.value)} />
            </label>
          </section>

          <section className="grid gap-3">
            <div>
              <h3 className="text-sm font-semibold text-stone-950">{t('pages.blocksTitle')}</h3>
              <p className="mt-1 text-xs leading-5 text-stone-500">{t('pages.blocksHelp')}</p>
            </div>
            <PageBuilder blocks={blocks} onChange={setBlocks} canManageStructure={admin} />
          </section>

          <PublishActions status={currentStatus} onCancel={resetForm} />
        </form>
        )}
      </Panel>
      <Panel title={t('pages.title')}>
        <div className="grid gap-3">
          {pages.map((page) => (
            <div key={page.id} className="flex flex-col gap-3 rounded-md border border-stone-200 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-semibold text-stone-950">{page.title}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-stone-500">
                  <span>/{page.slug}</span>
                  <StatusBadge status={page.published ? 'published' : 'draft'} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <IconButton label={t('common.edit')} icon={<Pencil size={16} />} onClick={() => edit(page)} />
                <IconButton label={t('common.delete')} icon={<Trash2 size={16} />} tone="danger" onClick={() => setDeletePage(page)} />
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
