import type { Meta, StoryObj } from "@storybook/react-vite";
import { aMatch } from "../../test/api-fixtures";
import { MatchCard } from "./match-card";

const meta = {
  component: MatchCard,
  args: { match: aMatch() },
  decorators: [(Story) => <div className="max-w-sm">{Story()}</div>],
} satisfies Meta<typeof MatchCard>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Complete: Story = {};
export const MissingFacts: Story = {
  args: {
    match: aMatch(
      { monthly_rent_usd: null, condo_fee_usd: null, area_m2: null, bathrooms: null },
      64,
    ),
  },
};
