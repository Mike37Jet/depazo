import { Building2, ChevronDown, ExternalLink, EyeOff, Heart } from "lucide-react";
import { formatUsd } from "../../format/currency";
import { describeFacts, isSafeHttpsUrl, sourceName } from "../../format/listing";
import type { ListingSummary, Match } from "../../services/api-client";
import { GLASS_BUTTON_CLASSES, GlassSurface } from "../atoms/glass-surface";
import { ScoreBadge } from "../atoms/score-badge";
import { ScoreBreakdown } from "../molecules/score-breakdown";

export interface MatchCardProps {
  match: Match;
  onToggleSaved: (isSaved: boolean) => void;
  onDiscard?: (() => void) | undefined;
}

export function MatchCard({ match, onToggleSaved, onDiscard }: MatchCardProps) {
  const { listing, score, breakdown } = match;
  const facts = describeFacts(listing);
  const place = listing.neighborhood ?? listing.title;

  return (
    <article aria-label={listing.title} className="grid overflow-hidden rounded-lg bg-surface">
      <div className="relative">
        <ListingPhoto listing={listing} />
        <GlassSurface
          variant="clear"
          shape="circle"
          className="absolute top-2.5 right-2.5 bg-dim-media"
        >
          <button
            type="button"
            aria-pressed={match.is_saved}
            aria-label={
              match.is_saved ? `Quitar ${place} de favoritos` : `Agregar ${place} a favoritos`
            }
            onClick={() => onToggleSaved(!match.is_saved)}
            className={GLASS_BUTTON_CLASSES}
          >
            <Heart aria-hidden="true" className={match.is_saved ? "fill-current" : undefined} />
          </button>
        </GlassSurface>
      </div>
      <div className="grid gap-1.5 px-4 pt-3 pb-4">
        <div className="flex items-start justify-between gap-3">
          <ListingPrice listing={listing} />
          <ScoreBadge score={score} />
        </div>
        <span className="text-headline text-label">{place}</span>
        {!match.passed_hard_filters && (
          <span className="text-footnote text-label-2">Ya no cumple tus filtros</span>
        )}
        {facts.length > 0 && (
          <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-subhead text-label-2 tabular-nums">
            {facts.map((fact) => (
              <span key={fact}>{fact}</span>
            ))}
          </div>
        )}
        <details className="group mt-1">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-subhead text-accent [&::-webkit-details-marker]:hidden">
            Por qué {score} puntos
            <ChevronDown
              aria-hidden="true"
              className="size-4 transition-transform duration-snappy ease-spring group-open:rotate-180"
              strokeWidth={1.75}
            />
          </summary>
          <ScoreBreakdown items={breakdown} />
        </details>
        <div className="flex items-center justify-between gap-3">
          {isSafeHttpsUrl(listing.url) && (
            <a
              href={listing.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1 text-footnote text-label-2"
            >
              Ver en {sourceName(listing.source)}
              <ExternalLink aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
              <span className="sr-only">(se abre en otra pestaña)</span>
            </a>
          )}
          {onDiscard && (
            <button
              type="button"
              onClick={onDiscard}
              aria-label={`Descartar ${place}`}
              className="pressable ml-auto inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-footnote text-label-2"
            >
              <EyeOff aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
              Descartar
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function ListingPhoto({ listing }: { listing: ListingSummary }) {
  if (isSafeHttpsUrl(listing.image_url)) {
    return (
      <img
        src={listing.image_url}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="aspect-[16/10] w-full bg-surface-2 object-cover"
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="placeholder-photo grid aspect-[16/10] place-items-center text-placeholder-ink"
    >
      <Building2 className="size-11" strokeWidth={1.25} />
    </div>
  );
}

function ListingPrice({ listing }: { listing: ListingSummary }) {
  if (listing.monthly_rent_usd === null) {
    return <span className="text-title-3 text-label">Precio no publicado</span>;
  }
  const total = listing.monthly_rent_usd + (listing.condo_fee_usd ?? 0);
  return (
    <div className="grid gap-0.5">
      <span className="text-title-3 text-label tabular-nums">{formatUsd(total)} /mes</span>
      {listing.condo_fee_usd !== null && (
        <span className="text-subhead text-label-2 tabular-nums">
          {formatUsd(listing.monthly_rent_usd)} + {formatUsd(listing.condo_fee_usd)} alícuota
        </span>
      )}
    </div>
  );
}
