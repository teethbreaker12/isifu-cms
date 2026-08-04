import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

export function Modal({
  title,
  description,
  children,
  onClose,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/50 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <section
        className="quiet-reveal app-panel max-h-[90dvh] w-full max-w-xl overflow-hidden rounded-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-stone-200 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <h2 id="modal-title" className="panel-title">{title}</h2>
            {description && <p className="mt-1 text-sm leading-5 text-stone-500">{description}</p>}
          </div>
          <button
            type="button"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-950"
            onClick={onClose}
            aria-label="Close popup"
          >
            <X size={17} />
          </button>
        </header>
        <div className="max-h-[calc(90dvh-8rem)] overflow-auto p-4 sm:p-5">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-stone-200 px-4 py-3 sm:px-5">{footer}</footer>}
      </section>
    </div>
  );
}
