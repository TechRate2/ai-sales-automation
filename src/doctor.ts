import { loadSystemPrompt } from "./ai/prompt-loader";
import { loadConfig, validateConfig, type AppConfig, type ConfigIssue } from "./utils/config";

export interface DoctorCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
}

export interface DoctorReport {
  overallStatus: "pass" | "warn" | "fail";
  checks: DoctorCheck[];
}

export async function createDoctorReport(config: AppConfig = loadConfig()): Promise<DoctorReport> {
  const configIssues = validateConfig(config);
  const prompt = await loadSystemPrompt();
  const checks: DoctorCheck[] = [
    ...configIssues.map(configIssueToCheck),
    {
      name: "System prompt",
      status: prompt.ok ? "pass" : "fail",
      message: prompt.ok
        ? "Prompt Chị Hương đã đọc được."
        : `Không đọc được prompt: ${prompt.error.message}`
    },
    {
      name: "Botcake credentials",
      status: config.botcake.pageId !== undefined && config.botcake.apiToken !== undefined ? "pass" : "warn",
      message: createBotcakeCredentialMessage(config)
    },
    {
      name: "Pancake POS credentials",
      status: config.pancakePos.apiKey !== undefined && config.pancakePos.shopId !== undefined ? "pass" : "warn",
      message: config.pancakePos.apiKey !== undefined && config.pancakePos.shopId !== undefined
        ? "Đã có PANCAKE_POS_API_KEY và PANCAKE_POS_SHOP_ID."
        : "Chưa có PANCAKE_POS_API_KEY/PANCAKE_POS_SHOP_ID. Hệ thống chưa thể đọc sản phẩm/tồn kho thật."
    },
    {
      name: "Pancake Inbox credentials",
      status: hasPancakeApiCredentials(config) ? "pass" : "warn",
      message: createPancakeApiCredentialMessage(config)
    },
    {
      name: "Draft order safety",
      status: config.pancakePos.enableDraftOrderCreation ? "warn" : "pass",
      message: config.pancakePos.enableDraftOrderCreation
        ? "Tạo đơn nháp đang bật. Chỉ dùng khi đã xác minh trạng thái draft an toàn trong Pancake POS."
        : "Tạo đơn nháp đang tắt theo mặc định. Đây là trạng thái an toàn cho Phase 1."
    }
  ];

  return {
    overallStatus: summarizeStatus(checks),
    checks
  };
}

function createBotcakeCredentialMessage(config: AppConfig): string {
  if (config.botcake.pageId === undefined || config.botcake.apiToken === undefined) {
    return "Chưa có BOTCAKE_API_TOKEN hoặc không suy ra được Page ID. Hệ thống chưa thể gửi tin nhắn Botcake thật.";
  }

  if (config.botcake.pageIdSource === "token") {
    return "Đã có BOTCAKE_API_TOKEN; Page ID được suy ra từ payload token. Có thể nhập BOTCAKE_PAGE_ID thủ công nếu muốn khóa cứng.";
  }

  return "Đã có BOTCAKE_PAGE_ID và BOTCAKE_API_TOKEN.";
}

function createPancakeApiCredentialMessage(config: AppConfig): string {
  if (config.pancakeApi.pageAccessToken !== undefined && config.pancakeApi.pageId !== undefined) {
    return "Đã có PANCAKE_API_PAGE_ACCESS_TOKEN và PANCAKE_API_PAGE_ID để đọc Unified Inbox thật.";
  }

  if (config.pancakeApi.userAccessToken !== undefined) {
    return "Đã có PANCAKE_API_USER_ACCESS_TOKEN để list page. Cần Page Access Token để đọc conversations/messages thật.";
  }

  if (config.pancakeApi.pageAccessToken !== undefined && config.pancakeApi.pageId === undefined) {
    return "Đã có PANCAKE_API_PAGE_ACCESS_TOKEN nhưng thiếu PANCAKE_API_PAGE_ID.";
  }

  return "Chưa có PANCAKE_API_USER_ACCESS_TOKEN hoặc PANCAKE_API_PAGE_ACCESS_TOKEN. Unified Inbox chưa thể chạy thật.";
}

function hasPancakeApiCredentials(config: AppConfig): boolean {
  return config.pancakeApi.userAccessToken !== undefined
    || (config.pancakeApi.pageAccessToken !== undefined && config.pancakeApi.pageId !== undefined);
}

export function formatDoctorReport(report: DoctorReport): string {
  const lines = [
    "AI Sales Automation - Doctor Report",
    `Trạng thái tổng: ${renderStatus(report.overallStatus)}`,
    ""
  ];

  for (const check of report.checks) {
    lines.push(`${renderStatus(check.status)} ${check.name}: ${check.message}`);
  }

  lines.push("");
  lines.push("Lưu ý: Doctor không in secret và không tự gọi API tạo đơn. Nếu có FAIL, không deploy production.");

  return lines.join("\n");
}

async function main(): Promise<void> {
  const report = await createDoctorReport();
  console.log(formatDoctorReport(report));

  if (report.overallStatus === "fail") {
    process.exitCode = 1;
  }
}

function configIssueToCheck(issue: ConfigIssue): DoctorCheck {
  return {
    name: `Config ${issue.key}`,
    status: issue.level === "error" ? "fail" : "warn",
    message: issue.message
  };
}

function summarizeStatus(checks: readonly DoctorCheck[]): DoctorReport["overallStatus"] {
  if (checks.some((check) => check.status === "fail")) {
    return "fail";
  }

  if (checks.some((check) => check.status === "warn")) {
    return "warn";
  }

  return "pass";
}

function renderStatus(status: DoctorCheck["status"]): string {
  switch (status) {
    case "pass":
      return "[PASS]";
    case "warn":
      return "[WARN]";
    case "fail":
      return "[FAIL]";
  }
}

if (require.main === module) {
  void main();
}
