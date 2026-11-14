import type { Match } from "../../services/api-client";
import { Skeleton } from "../atoms/skeleton";
import { MatchCard } from "./match-card";

export interface MatchListProps {
  matches: Match[];
  onToggleSaved: (match: Match, isSaved: boolean) => void;
  onDiscard?: ((match: Match) => void) | undefined;
}

export function MatchList({ matches, onToggleSaved, onDiscard }: MatchListProps) {
  return (
    <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {matches.map((match) => (
        <li key={`${match.listing.source}-${match.listing.external_id}`}>
          <MatchCard
            match={match}
            onToggleSaved={(isSaved) => onToggleSaved(match, isSaved)}
            onDiscard={onDiscard ? () => onDiscard(match) : undefined}
          />
        </li>
      ))}
    </ul>
  );
}

export function MatchListSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="grid gap-4 md:grid-cols-2">
      {["first", "second", "third"].map((key) => (
        <div key={key} className="grid overflow-hidden rounded-lg bg-surface">
          <Skeleton className="aspect-[16/10] w-full rounded-none" />
          <div className="grid gap-2 p-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}
