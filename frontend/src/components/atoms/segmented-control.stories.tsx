import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { SegmentedControl } from "./segmented-control";

const THEMES = [
  { value: "system", label: "Sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
];

function InteractiveSegmentedControl() {
  const [value, setValue] = useState("system");
  return <SegmentedControl label="Tema" options={THEMES} value={value} onChange={setValue} />;
}

const meta = { component: InteractiveSegmentedControl } satisfies Meta<
  typeof InteractiveSegmentedControl
>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Theme: Story = {};
