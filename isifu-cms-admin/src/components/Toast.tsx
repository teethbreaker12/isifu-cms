import { Check, CheckCircle2, Clipboard, X, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

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

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-3 top-3 z-[70] grid w-[min(24rem,calc(100vw-1.5rem))] gap-2 sm:right-5 sm:top-5">
        {toasts.map((toast) => {
          const Icon = toast.kind === 'success' ? CheckCircle2 : XCircle;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto quiet-reveal flex items-start gap-3 rounded-lg border bg-white px-3 py-3 shadow-lg ${
                toast.kind === 'success' ? 'accent-border' : 'border-red-200'
              }`}
              role="status"
            >
              <Icon className={toast.kind === 'success' ? 'accent-text mt-0.5' : 'mt-0.5 text-red-700'} size={18} />
              <div className="max-h-64 min-w-0 flex-1 overflow-auto whitespace-pre-wrap break-words text-sm font-medium leading-5 text-stone-800">
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
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
