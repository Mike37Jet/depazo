import type { Meta, StoryObj } from "@storybook/react-vite";
import { SAVED_PROFILE } from "../../test/api-fixtures";
import { SearchProfileForm } from "./search-profile-form";

const meta = {
  component: SearchProfileForm,
  args: { profile: SAVED_PROFILE, isSaving: false, status: null, onSave: () => undefined },
  decorators: [(Story) => <div className="max-w-md bg-bg p-4">{Story()}</div>],
} satisfies Meta<typeof SearchProfileForm>;
export default meta;

type Story = StoryObj<typeof meta>;

export const SavedProfile: Story = {};
export const NewUser: Story = { args: { profile: null } };
export const Saved: Story = {
  args: {
    status: { tone: "success", message: "Búsqueda guardada. Tus coincidencias ya están al día." },
  },
};
