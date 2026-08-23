import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

export function Modal({
  title,
  description,
  children,
  onClose,
  footer,
  size = 'default',
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  size?: 'default' | 'wide';
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
    <div className="fixed inset-0 z-[900] grid place-items-center overflow-y-auto bg-stone-950/50 p-3 backdrop-blur-sm sm:p-4" onMouseDown={onClose}>
      <section
        className={`quiet-reveal app-panel my-auto flex max-h-[calc(100dvh-1.5rem)] w-full min-w-0 flex-col overflow-hidden rounded-lg sm:max-h-[calc(100dvh-2rem)] ${size === 'wide' ? 'max-w-6xl' : 'max-w-xl'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="shrink-0 flex items-start justify-between gap-4 border-b border-stone-200 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <h2 id="modal-title" className="panel-title">{title}</h2>
            {description && <p className="mt-1 break-words text-sm leading-5 text-stone-500 [overflow-wrap:anywhere]">{description}</p>}
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
        <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-5">{children}</div>
        {footer && <footer className="shrink-0 flex flex-wrap justify-end gap-2 border-t border-stone-200 px-4 py-3 sm:px-5">{footer}</footer>}
      </section>
    </div>
  );
}
