import { describe, expect, it } from "vitest";
import { isFailedSignInRedirect } from "./supabase-auth-gateway";

describe("isFailedSignInRedirect", () => {
  it("detects an error reported in the query string", () => {
    expect(isFailedSignInRedirect("?error=access_denied&error_code=signup_disabled", "")).toBe(
      true,
    );
  });

  it("detects an error reported in the fragment", () => {
    expect(isFailedSignInRedirect("", "#error=server_error")).toBe(true);
  });

  it("ignores a successful return and a plain visit", () => {
    expect(isFailedSignInRedirect("?code=abc123", "")).toBe(false);
    expect(isFailedSignInRedirect("", "")).toBe(false);
  });
});
