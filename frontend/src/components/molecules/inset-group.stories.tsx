import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "../atoms/input";
import { FieldRow } from "./field-row";
import { InsetGroup } from "./inset-group";

const meta = {
  component: InsetGroup,
  args: {
    title: "Presupuesto",
    footer: "La alícuota son los gastos de condominio.",
    children: null,
  },
} satisfies Meta<typeof InsetGroup>;
export default meta;

type Story = StoryObj<typeof meta>;

export const WithFields: Story = {
  render: (args) => (
    <InsetGroup {...args}>
      <FieldRow label="Máximo al mes (USD)" htmlFor="max">
        <Input id="max" defaultValue="900" className="text-right" />
      </FieldRow>
      <FieldRow
        label="Mínimo al mes (USD)"
        htmlFor="min"
        error="El mínimo no puede ser mayor que el máximo."
      >
        <Input id="min" defaultValue="1200" isInvalid className="text-right" />
      </FieldRow>
    </InsetGroup>
  ),
};
