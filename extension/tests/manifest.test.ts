import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as z from "zod/mini";

const manifestSchema = z.object({
  key: z.string(),
  permissions: z.array(z.string()),
  host_permissions: z.array(z.string()),
  background: z.strictObject({ service_worker: z.string() }),
  content_security_policy: z.strictObject({ extension_pages: z.string() }),
});

const manifest = manifestSchema.parse(
  JSON.parse(readFileSync(join(import.meta.dirname, "../public/manifest.json"), "utf8")),
);

function extensionIdOf(publicKey: string): string {
  const digest = createHash("sha256").update(Buffer.from(publicKey, "base64")).digest("hex");
  return [...digest.slice(0, 32)]
    .map((digit) => String.fromCharCode("a".charCodeAt(0) + Number.parseInt(digit, 16)))
    .join("");
}

describe("extension manifest", () => {
  it("pins the extension id the native host allows", () => {
    expect(extensionIdOf(manifest.key)).toBe("fabgniffhpmdifgbdlgjchjchgfjcldm");
  });

  it("asks only for storage, alarms and native messaging", () => {
    expect(manifest.permissions).toEqual(["storage", "alarms", "nativeMessaging"]);
    expect(manifest.host_permissions).toEqual([
      "https://www.plusvalia.com/*",
      "https://www.facebook.com/*",
    ]);
  });

  it("denies the extension pages any network connection of their own", () => {
    expect(manifest.content_security_policy.extension_pages).toContain("connect-src 'none'");
  });

  it("loads the service worker the build produces", () => {
    const buildScript = readFileSync(join(import.meta.dirname, "../build.mjs"), "utf8");

    expect(manifest.background.service_worker).toBe("background/serviceWorker.js");
    expect(buildScript).toContain('"background/serviceWorker": "src/background/serviceWorker.ts"');
  });
});
