import type { Meta, StoryObj } from "@storybook/react-vite";
import { Chip } from "./chip";

const meta = { component: Chip, args: { label: "La Carolina" } } satisfies Meta<typeof Chip>;
export default meta;

type Story = StoryObj<typeof meta>;

export const ReadOnly: Story = {};
export const Removable: Story = { args: { onRemove: () => undefined } };
