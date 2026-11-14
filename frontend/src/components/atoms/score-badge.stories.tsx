import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScoreBadge } from "./score-badge";

const meta = { component: ScoreBadge, args: { score: 87 } } satisfies Meta<typeof ScoreBadge>;
export default meta;

type Story = StoryObj<typeof meta>;

export const High: Story = {};
export const Mid: Story = { args: { score: 68 } };
export const Low: Story = { args: { score: 42 } };
