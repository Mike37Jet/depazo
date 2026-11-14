import type { StorybookConfig } from "@storybook/react-vite";
import type { PluginOption } from "vite";

const config: StorybookConfig = {
  stories: ["../src/components/**/*.stories.tsx"],
  framework: "@storybook/react-vite",
  core: { disableTelemetry: true },
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    plugins: (viteConfig.plugins ?? []).flat().filter((plugin) => !isPwaPlugin(plugin)),
  }),
};

function isPwaPlugin(plugin: PluginOption): boolean {
  return (
    typeof plugin === "object" &&
    plugin !== null &&
    "name" in plugin &&
    plugin.name.startsWith("vite-plugin-pwa")
  );
}

export default config;
