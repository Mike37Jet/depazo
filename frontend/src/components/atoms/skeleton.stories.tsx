import type { Meta, StoryObj } from "@storybook/react-vite";
import { Skeleton } from "./skeleton";

const meta = { component: Skeleton, args: { className: "h-6 w-48" } } satisfies Meta<
  typeof Skeleton
>;
export default meta;

export const Line: StoryObj<typeof meta> = {};
