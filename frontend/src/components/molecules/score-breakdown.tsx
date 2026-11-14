export interface BreakdownItem {
  criterion: string;
  value: number;
  weight: number;
}

const CRITERION_NAMES: Record<string, string> = {
  price: "Precio",
  area: "Superficie",
  neighborhood: "Zona",
};

const PERCENT = 100;

export function criterionName(criterion: string): string {
  return CRITERION_NAMES[criterion] ?? criterion;
}

export function criterionPoints(items: BreakdownItem[]) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0) || 1;
  return items.map((item) => {
    const maximum = Math.round((item.weight / totalWeight) * PERCENT);
    return {
      criterion: item.criterion,
      earned: Math.round(item.value * maximum),
      maximum,
      fill: Math.round(item.value * PERCENT),
    };
  });
}

export function ScoreBreakdown({ items }: { items: BreakdownItem[] }) {
  return (
    <ul className="inset-group overflow-hidden rounded-md bg-surface-2">
      {criterionPoints(items).map((item) => (
        <li
          key={item.criterion}
          className="grid min-h-11 grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 px-4 py-2.5"
        >
          <span className="text-body text-label">{criterionName(item.criterion)}</span>
          <span className="text-subhead text-label-2 tabular-nums">
            {item.earned} / {item.maximum}
          </span>
          <span
            aria-hidden="true"
            className="col-span-2 h-1 overflow-hidden rounded-full bg-surface-2"
          >
            <span
              className="block h-full rounded-full bg-score-high"
              style={{ width: `${item.fill}%` }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
