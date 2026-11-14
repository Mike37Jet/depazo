import type { ReactNode } from "react";
import { TabBar, type TabItem } from "../organisms/tab-bar";

export function AppShell({ tabs, children }: { tabs: TabItem[]; children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      {children}
      <TabBar items={tabs} />
    </div>
  );
}
