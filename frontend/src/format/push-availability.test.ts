import { describe, expect, it } from "vitest";
import { explainPushAvailability } from "./push-availability";

describe("explainPushAvailability", () => {
  it("tells blocked users where to allow notifications", () => {
    expect(explainPushAvailability("blocked")).toMatch(/ajustes del navegador/);
  });
});
