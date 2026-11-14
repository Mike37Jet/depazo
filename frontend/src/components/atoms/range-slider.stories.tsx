import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { RangeSlider } from "./range-slider";

function InteractiveRangeSlider({ initialValue }: { initialValue: number }) {
  const [value, setValue] = useState(initialValue);
  return <RangeSlider label="Apariencia del vidrio" value={value} onChange={setValue} />;
}

const meta = {
  component: InteractiveRangeSlider,
  args: { initialValue: 30 },
} satisfies Meta<typeof InteractiveRangeSlider>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Partial: Story = {};
export const Empty: Story = { args: { initialValue: 0 } };
