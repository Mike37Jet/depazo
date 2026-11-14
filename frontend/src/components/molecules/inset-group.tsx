import type { ReactNode } from "react";

export interface InsetGroupProps {
  title?: string;
  footer?: string;
  children: ReactNode;
}

export function InsetGroup({ title, footer, children }: InsetGroupProps) {
  return (
    <section className="grid gap-1.5">
      {title && <h2 className="px-4 text-footnote text-label-2 uppercase">{title}</h2>}
      <div className="inset-group overflow-hidden rounded-md bg-surface">{children}</div>
      {footer && <p className="px-4 text-footnote text-label-2">{footer}</p>}
    </section>
  );
}
