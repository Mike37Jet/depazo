import type { Meta, StoryObj } from "@storybook/react-vite";
import { SearchX } from "lucide-react";
import { Button } from "../atoms/button";
import { EmptyState } from "./empty-state";

const meta = {
  component: EmptyState,
  args: {
    icon: SearchX,
    title: "Ningún anuncio cumple tus filtros",
    message:
      "Revisamos 555 anuncios y ninguno entra en tu presupuesto, espacio o sectores. Prueba subir el presupuesto o bajar los mínimos.",
  },
} satisfies Meta<typeof EmptyState>;
export default meta;

type Story = StoryObj<typeof meta>;

export const WithoutAction: Story = {};
export const WithAction: Story = { args: { action: <Button>Ajustar filtros</Button> } };
