import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const OPENAPI_TYPESCRIPT = "openapi-typescript@7.13.0";
const TYPESCRIPT_FOR_GENERATOR = "typescript@5.9.3";

const backendDirectory = fileURLToPath(new URL("../../backend/", import.meta.url));
const schemaPath = fileURLToPath(new URL("../src/api/schema.ts", import.meta.url));
const workDirectory = mkdtempSync(join(tmpdir(), "depazo-openapi-"));
const descriptionPath = join(workDirectory, "openapi.json");

try {
  const description = execFileSync("uv", ["run", "--quiet", "depazo", "openapi"], {
    cwd: backendDirectory,
    encoding: "utf8",
  });
  writeFileSync(descriptionPath, description);
  execFileSync(
    "pnpm",
    [
      "dlx",
      `--package=${OPENAPI_TYPESCRIPT}`,
      `--package=${TYPESCRIPT_FOR_GENERATOR}`,
      "openapi-typescript",
      descriptionPath,
      "--output",
      schemaPath,
      "--default-non-nullable",
    ],
    { stdio: "inherit" },
  );
  const withoutComments = readFileSync(schemaPath, "utf8").replace(/\/\*\*[\s\S]*?\*\/\n?/g, "");
  writeFileSync(schemaPath, withoutComments);
  execFileSync("pnpm", ["exec", "biome", "format", "--write", schemaPath], { stdio: "inherit" });
} finally {
  rmSync(workDirectory, { recursive: true, force: true });
}
