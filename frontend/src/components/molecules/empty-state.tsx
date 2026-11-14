import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg bg-surface px-6 py-10 text-center">
      <Icon aria-hidden="true" className="size-10 text-label-2" strokeWidth={1.75} />
      <h2 className="text-title-3 text-label">{title}</h2>
      <p className="max-w-80 text-callout text-label-2">{message}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
