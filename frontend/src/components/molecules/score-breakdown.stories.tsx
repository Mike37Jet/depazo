import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScoreBreakdown } from "./score-breakdown";

const meta = {
  component: ScoreBreakdown,
  args: {
    items: [
      { criterion: "price", value: 0.92, weight: 0.5 },
      { criterion: "area", value: 0.6, weight: 0.25 },
      { criterion: "neighborhood", value: 1, weight: 0.25 },
    ],
  },
} satisfies Meta<typeof ScoreBreakdown>;
export default meta;

export const ThreeCriteria: StoryObj<typeof meta> = {};
