import { describe, expect, it } from "vitest";
import { createDoctorReport, formatDoctorReport } from "../src/doctor";
import { loadConfig } from "../src/utils/config";

describe("doctor", () => {
  it("warns when credentials are missing in development", async () => {
    const report = await createDoctorReport(loadConfig({
      NODE_ENV: "development"
    }));

    expect(report.overallStatus).toBe("warn");
    expect(report.checks.some((check) => check.name === "Botcake credentials" && check.status === "warn")).toBe(true);
    expect(report.checks.some((check) => check.name === "Pancake POS credentials" && check.status === "warn")).toBe(true);
  });

  it("fails production when required credentials are missing", async () => {
    const report = await createDoctorReport(loadConfig({
      NODE_ENV: "production"
    }));

    expect(report.overallStatus).toBe("fail");
    expect(report.checks.some((check) => check.name === "Config BOTCAKE_API_TOKEN" && check.status === "fail")).toBe(true);
  });

  it("keeps secrets out of the formatted report", async () => {
    const report = await createDoctorReport(loadConfig({
      BOTCAKE_PAGE_ID: "page-1",
      BOTCAKE_API_TOKEN: "dummy-token-for-test",
      PANCAKE_POS_API_KEY: "dummy-api-key-for-test",
      PANCAKE_POS_SHOP_ID: "shop-1"
    }));

    const formatted = formatDoctorReport(report);

    expect(formatted).not.toContain("dummy-token-for-test");
    expect(formatted).not.toContain("dummy-api-key-for-test");
  });
});
