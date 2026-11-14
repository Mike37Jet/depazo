import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { TagInput } from "./tag-input";

const meta = {
  component: TagInput,
  args: {
    label: "Preferidos",
    placeholder: "Busca un sector, ej. La Carolina",
    values: ["González Suárez"],
    options: [
      { name: "La Carolina", listingCount: 154 },
      { name: "Iñaquito", listingCount: 40 },
      { name: "Cumbayá", listingCount: 30 },
      { name: "Carcelén", listingCount: 12 },
      { name: "González Suárez", listingCount: 9 },
    ],
    onChange: () => undefined,
  },
} satisfies Meta<typeof TagInput>;
export default meta;

export const Interactive: StoryObj<typeof meta> = {
  render: function InteractiveTagInput(args) {
    const [values, setValues] = useState(args.values);
    return <TagInput {...args} values={values} onChange={setValues} />;
  },
};
