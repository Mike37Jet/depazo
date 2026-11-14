import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./input";

const meta = {
  component: Input,
  args: { placeholder: "nombre@correo.com", "aria-label": "Email" },
} satisfies Meta<typeof Input>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const Invalid: Story = { args: { isInvalid: true, defaultValue: "persona" } };
