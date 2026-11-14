import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

export interface TabItem {
  to: "/" | "/favoritos" | "/busqueda" | "/cuenta";
  label: string;
  icon: LucideIcon;
}

export function TabBar({ items }: { items: TabItem[] }) {
  return (
    <nav
      aria-label="Navegación principal"
      className="glass glass-regular fixed right-2.5 bottom-[calc(var(--spacing)*3+var(--safe-bottom))] left-2.5 z-20 mx-auto max-w-105 rounded-full px-1.25"
    >
      <ul
        className="grid h-15.5 items-center"
        style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
      >
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: true }}
              className="pressable grid min-h-13 content-center justify-items-center gap-px rounded-full text-caption-2 font-semibold text-label transition-colors duration-fade data-[status=active]:bg-glass-select data-[status=active]:text-accent"
            >
              <Icon aria-hidden="true" className="size-5.5" strokeWidth={1.9} />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
