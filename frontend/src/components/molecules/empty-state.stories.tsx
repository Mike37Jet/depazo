import type { Meta, StoryObj } from "@storybook/react-vite";
import { SearchX } from "lucide-react";
import { Button } from "../atoms/button";
import { EmptyState } from "./empty-state";

const meta = {
  component: EmptyState,
  args: {
    icon: SearchX,
    title: "Aún no hay coincidencias",
    message: "Prueba subir tu presupuesto, bajar el puntaje mínimo o quitar sectores excluidos.",
  },
} satisfies Meta<typeof EmptyState>;
export default meta;

type Story = StoryObj<typeof meta>;

export const WithoutAction: Story = {};
export const WithAction: Story = { args: { action: <Button>Ajustar búsqueda</Button> } };
