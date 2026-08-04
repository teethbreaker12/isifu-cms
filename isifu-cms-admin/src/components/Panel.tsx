import type { ReactNode } from 'react';

export function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="app-panel min-w-0 overflow-hidden rounded-lg">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/80 px-4 py-3 sm:px-5">
        <h2 className="panel-title min-w-0">{title}</h2>
        {action}
      </header>
      <div className="min-w-0 p-4 sm:p-5">{children}</div>
    </section>
  );
}
