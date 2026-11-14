import { joinClassNames } from "../class-names";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={joinClassNames(
        "animate-pulse rounded-md bg-surface-2 motion-reduce:animate-none",
        className,
      )}
    />
  );
}
