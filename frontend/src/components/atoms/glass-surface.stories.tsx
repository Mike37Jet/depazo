import type { Meta, StoryObj } from "@storybook/react-vite";
import { Heart, SlidersHorizontal } from "lucide-react";
import { GLASS_BUTTON_CLASSES, GlassSurface } from "./glass-surface";

const meta = {
  component: GlassSurface,
  args: {
    children: (
      <button type="button" aria-label="Editar búsqueda" className={GLASS_BUTTON_CLASSES}>
        <SlidersHorizontal aria-hidden="true" />
      </button>
    ),
  },
} satisfies Meta<typeof GlassSurface>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Regular: Story = {};

export const ClearOverPhoto: Story = {
  args: {
    variant: "clear",
    shape: "circle",
    children: <Heart aria-hidden="true" className="size-5" />,
  },
  decorators: [
    (Story) => (
      <div className="placeholder-photo grid h-48 w-72 place-items-start rounded-lg p-3">
        <Story />
      </div>
    ),
  ],
};
