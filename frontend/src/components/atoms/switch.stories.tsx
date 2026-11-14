import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Switch } from "./switch";

const meta = {
  component: Switch,
  args: { isChecked: true, onCheckedChange: () => undefined },
} satisfies Meta<typeof Switch>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {
  render: function InteractiveSwitch(args) {
    const [isChecked, setIsChecked] = useState(args.isChecked);
    return (
      <div className="flex items-center gap-3">
        <span id="condo-label">Incluir alícuota</span>
        <Switch isChecked={isChecked} onCheckedChange={setIsChecked} labelledBy="condo-label" />
      </div>
    );
  },
};
