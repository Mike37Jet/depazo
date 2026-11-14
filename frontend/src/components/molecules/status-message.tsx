import { CircleAlert, CircleCheck } from "lucide-react";
import { joinClassNames } from "../class-names";

export type StatusTone = "success" | "error";

export interface StatusMessageProps {
  tone: StatusTone;
  message: string;
}

export function StatusMessage({ tone, message }: StatusMessageProps) {
  const Icon = tone === "success" ? CircleCheck : CircleAlert;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={joinClassNames(
        "flex items-start gap-2 rounded-md bg-surface px-4 py-3 text-subhead",
        tone === "error" ? "text-danger" : "text-score-high",
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
      <span>{message}</span>
    </p>
  );
}
