import { CheckCircle2, X, XCircle } from 'lucide-react';
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

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, kind, message }].slice(-4));
    window.setTimeout(() => dismiss(id), 4200);
  }, [dismiss]);

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
              <div className="min-w-0 flex-1 text-sm font-medium leading-5 text-stone-800">{toast.message}</div>
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
