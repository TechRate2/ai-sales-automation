import { describe, expect, it } from "vitest";
import { loadConfig, validateConfig } from "../../src/utils/config";

describe("config", () => {
  it("keeps draft order disabled by default", () => {
    const config = loadConfig({});

    expect(config.pancakePos.enableDraftOrderCreation).toBe(false);
    expect(config.pancakePos.safeDraftStatuses).toEqual([]);
  });

  it("rejects confirmed status as a safe draft status", () => {
    const config = loadConfig({
      ENABLE_POS_DRAFT_ORDER: "true",
      PANCAKE_POS_SAFE_DRAFT_STATUSES: "1,17"
    });

    const issues = validateConfig(config);

    expect(issues.some((issue) => issue.key === "PANCAKE_POS_SAFE_DRAFT_STATUSES")).toBe(true);
  });

  it("requires external credentials in production", () => {
    const config = loadConfig({
      NODE_ENV: "production"
    });

    const issues = validateConfig(config);

    expect(issues.map((issue) => issue.key)).toEqual(
      expect.arrayContaining([
        "BOTCAKE_PAGE_ID",
        "BOTCAKE_API_TOKEN",
        "PANCAKE_POS_API_KEY",
        "PANCAKE_POS_SHOP_ID"
      ])
    );
  });
});
