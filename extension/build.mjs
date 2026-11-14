import { cp, mkdir, rm } from "node:fs/promises";
import { build } from "esbuild";

const OUTPUT_DIRECTORY = "dist";

await rm(OUTPUT_DIRECTORY, { recursive: true, force: true });
await mkdir(OUTPUT_DIRECTORY);
await build({
  entryPoints: {
    "content/plusvalia": "src/content/plusvalia.ts",
    "popup/popup": "src/popup/popup.ts",
  },
  bundle: true,
  format: "iife",
  target: "chrome120",
  minify: true,
  outdir: OUTPUT_DIRECTORY,
});
await cp("public", OUTPUT_DIRECTORY, { recursive: true });
