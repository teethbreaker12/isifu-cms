import type { ReactNode } from 'react';

export function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="min-w-0 rounded-lg border border-stone-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-4 py-4 sm:px-5">
        <h2 className="min-w-0 text-base font-semibold tracking-tight text-stone-950">{title}</h2>
        {action}
      </header>
      <div className="min-w-0 p-4 sm:p-5">{children}</div>
    </section>
  );
}
