import { Check, CheckCircle2, Clipboard, X, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type ToastKind = 'success' | 'error';
type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
};

const ToastContext = createContext<{
  notify: (message: string, kind?: ToastKind) => void;
}>({
  notify: () => undefined,
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [copiedToastId, setCopiedToastId] = useState<number | null>(null);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, kind, message }].slice(-4));
    window.setTimeout(() => dismiss(id), kind === 'error' ? 20000 : 4200);
  }, [dismiss]);

  const copyMessage = useCallback(async (toast: Toast) => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(toast.message);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = toast.message;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedToastId(toast.id);
    window.setTimeout(() => setCopiedToastId((current) => (current === toast.id ? null : current)), 1600);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);
  const toastRoot = (
    <div className="pointer-events-none fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[1000] grid max-h-[calc(100dvh-1.5rem)] gap-2 overflow-hidden sm:left-auto sm:right-5 sm:top-[max(1.25rem,env(safe-area-inset-top))] sm:w-[min(26rem,calc(100vw-2.5rem))]">
      {toasts.map((toast) => {
        const Icon = toast.kind === 'success' ? CheckCircle2 : XCircle;
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto quiet-reveal flex max-h-[min(24rem,calc(100dvh-2rem))] min-w-0 items-start gap-3 overflow-hidden rounded-lg border bg-white px-3 py-3 shadow-lg ${
              toast.kind === 'success' ? 'accent-border' : 'border-red-200'
            }`}
            role={toast.kind === 'error' ? 'alert' : 'status'}
          >
            <Icon className={toast.kind === 'success' ? 'accent-text mt-0.5 shrink-0' : 'mt-0.5 shrink-0 text-red-700'} size={18} />
            <div className="min-w-0 flex-1 overflow-auto whitespace-pre-wrap break-words text-sm font-medium leading-5 text-stone-800 [overflow-wrap:anywhere]">
              {toast.message}
            </div>
            {toast.kind === 'error' && (
              <button
                type="button"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-950"
                onClick={() => void copyMessage(toast)}
                aria-label="Copy error details"
                title="Copy error details"
              >
                {copiedToastId === toast.id ? <Check size={15} /> : <Clipboard size={15} />}
              </button>
            )}
            <button
              type="button"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-950"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(toastRoot, document.body)}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
