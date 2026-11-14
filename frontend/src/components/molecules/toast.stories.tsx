import type { Meta, StoryObj } from "@storybook/react-vite";
import { Toast } from "./toast";

const meta = {
  component: Toast,
  args: { message: "Descartado: Bellavista", actionLabel: "Deshacer", onAction: () => undefined },
} satisfies Meta<typeof Toast>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Undo: Story = {};
