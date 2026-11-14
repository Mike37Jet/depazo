import type { Meta, StoryObj } from "@storybook/react-vite";
import { aMatch } from "../../test/api-fixtures";
import { MatchCard } from "./match-card";

const meta = {
  component: MatchCard,
  args: { match: aMatch(), onToggleSaved: () => undefined },
  decorators: [(Story) => <div className="max-w-sm">{Story()}</div>],
} satisfies Meta<typeof MatchCard>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Complete: Story = { args: { onDiscard: () => undefined } };
export const MissingFacts: Story = {
  args: {
    match: aMatch(
      { monthly_rent_usd: null, condo_fee_usd: null, area_m2: null, bathrooms: null },
      64,
    ),
  },
};
export const FromMarketplace: Story = {
  args: {
    match: aMatch(
      { source: "marketplace", title: "Arriendo suite", area_m2: null, bathrooms: null },
      71,
    ),
  },
};
export const Saved: Story = { args: { match: { ...aMatch(), is_saved: true } } };
export const NoLongerFits: Story = {
  args: { match: { ...aMatch(), is_saved: true, passed_hard_filters: false } },
};
