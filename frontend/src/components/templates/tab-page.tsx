import type { ReactNode } from "react";

export interface TabPageProps {
  title: string;
  subtitle?: string;
  status?: string | undefined;
  actions?: ReactNode;
  children: ReactNode;
}

export function TabPage({ title, subtitle, status, actions, children }: TabPageProps) {
  return (
    <>
      <div
        aria-hidden="true"
        className="edge-top pointer-events-none fixed inset-x-0 top-0 z-10 h-18.5"
      />
      {actions && (
        <div className="fixed top-[calc(var(--spacing)*3+var(--safe-top))] right-3.5 z-20">
          {actions}
        </div>
      )}
      <main className="mx-auto grid w-full max-w-[1080px] content-start gap-4 px-4 pt-[calc(var(--spacing)*13+var(--safe-top))] pb-32 min-[390px]:px-5">
        <header className="grid gap-1">
          <h1 className="text-large-title text-label">{title}</h1>
          {subtitle && <p className="text-subhead text-label-2">{subtitle}</p>}
          {status && (
            <p className="flex items-center gap-1.5 text-footnote text-label-2">
              <span aria-hidden="true" className="size-1.75 rounded-full bg-score-high" />
              {status}
            </p>
          )}
        </header>
        {children}
      </main>
    </>
  );
}
