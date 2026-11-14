export interface ToastProps {
  message: string;
  actionLabel: string;
  onAction: () => void;
}

export function Toast({ message, actionLabel, onAction }: ToastProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--spacing)*22+var(--safe-bottom))] z-30 flex justify-center px-4">
      <div
        role="status"
        className="glass glass-regular pointer-events-auto inline-flex max-w-full items-center gap-2 rounded-full py-1 pr-1.5 pl-4.5 text-subhead font-medium"
      >
        <span className="truncate">{message}</span>
        <button
          type="button"
          onClick={onAction}
          className="pressable min-h-11 shrink-0 rounded-full px-3.5 text-subhead font-semibold text-accent"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
