import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";

const meta = { component: Button, args: { children: "Guardar búsqueda" } } satisfies Meta<
  typeof Button
>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: "secondary", children: "Reintentar" } };
export const Outlined: Story = {
  args: { variant: "outlined", children: "Continuar con Google" },
};
export const Plain: Story = { args: { variant: "plain", children: "Usar otro email" } };
export const Destructive: Story = { args: { variant: "destructive", children: "Cerrar sesión" } };
export const Disabled: Story = { args: { disabled: true, children: "Guardando…" } };
