import { describe, expect, it } from "vitest";
import { redactSensitive } from "../../src/utils/logger";

describe("logger redaction", () => {
  it("redacts nested sensitive keys", () => {
    const output = redactSensitive({
      api_key: "secret",
      nested: {
        phone: "0900000000",
        safe: "visible"
      }
    });

    expect(output).toEqual({
      api_key: "[REDACTED]",
      nested: {
        phone: "[REDACTED]",
        safe: "visible"
      }
    });
  });
});
