import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatusMessage } from "./status-message";

const meta = {
  component: StatusMessage,
  args: { tone: "success", message: "Búsqueda guardada. Tus coincidencias ya están al día." },
} satisfies Meta<typeof StatusMessage>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Success: Story = {};
export const Failure: Story = {
  args: { tone: "error", message: "No pudimos guardar tu búsqueda. Inténtalo de nuevo." },
};
