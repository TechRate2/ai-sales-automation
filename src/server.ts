import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { loadSystemPrompt } from "./ai/prompt-loader";
import { loadConfig, validateConfig, type AppConfig } from "./utils/config";
import { createLogger } from "./utils/logger";

const webRoot = resolve(process.cwd(), "web");

interface ReadinessItem {
  key: string;
  label: string;
  status: "pass" | "warn" | "fail";
  message: string;
}

interface ReadinessPayload {
  environment: string;
  overallStatus: "pass" | "warn" | "fail";
  items: ReadinessItem[];
  services: {
    botcake: ServiceStatus;
    pancakePos: ServiceStatus;
    draftOrder: ServiceStatus;
  };
}

interface ServiceStatus {
  status: "pass" | "warn" | "fail";
  label: string;
  message: string;
}

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({ level: config.logLevel });
  const server = createServer((request, response) => {
    void handleRequest(request, response, config, logger);
  });

  server.listen(config.port, () => {
    logger.info("ui_server_started", {
      port: config.port,
      url: `http://localhost:${config.port}`
    });
  });
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  config: AppConfig,
  logger: ReturnType<typeof createLogger>
): Promise<void> {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (url.pathname === "/api/readiness") {
    const payload = await buildReadinessPayload(config);
    sendJson(response, payload);
    return;
  }

  if (url.pathname === "/health") {
    sendJson(response, { ok: true });
    return;
  }

  const staticPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = resolveStaticPath(staticPath);

  if (filePath === undefined) {
    sendText(response, 403, "Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypeFor(filePath),
      "Cache-Control": "no-store"
    });
    response.end(file);
  } catch (error) {
    logger.warn("static_file_not_found", {
      path: staticPath,
      error: error instanceof Error ? error.message : String(error)
    });
    sendText(response, 404, "Not found");
  }
}

async function buildReadinessPayload(config: AppConfig): Promise<ReadinessPayload> {
  const prompt = await loadSystemPrompt();
  const configIssues = validateConfig(config);
  const items: ReadinessItem[] = [
    {
      key: "system_prompt",
      label: "System prompt",
      status: prompt.ok ? "pass" : "fail",
      message: prompt.ok ? "Prompt Chị Hương đã sẵn sàng." : "Không đọc được prompt hệ thống."
    },
    {
      key: "botcake_credentials",
      label: "Botcake credentials",
      status: hasBotcakeCredentials(config) ? "pass" : "warn",
      message: hasBotcakeCredentials(config)
        ? "Đã có Page ID và API token."
        : "Chưa có BOTCAKE_PAGE_ID/BOTCAKE_API_TOKEN."
    },
    {
      key: "pancake_pos_credentials",
      label: "Pancake POS credentials",
      status: hasPancakePosCredentials(config) ? "pass" : "warn",
      message: hasPancakePosCredentials(config)
        ? "Đã có API key và Shop ID."
        : "Chưa có PANCAKE_POS_API_KEY/PANCAKE_POS_SHOP_ID."
    },
    {
      key: "draft_order_safety",
      label: "Draft order safety",
      status: config.pancakePos.enableDraftOrderCreation ? "warn" : "pass",
      message: config.pancakePos.enableDraftOrderCreation
        ? "Tạo đơn nháp đang bật, cần xác minh status draft trước production."
        : "Tạo đơn nháp đang tắt, an toàn cho giai đoạn hiện tại."
    },
    ...configIssues.map((issue) => ({
      key: `config_${issue.key}`,
      label: issue.key,
      status: issue.level === "error" ? "fail" as const : "warn" as const,
      message: issue.message
    }))
  ];

  return {
    environment: config.env,
    overallStatus: summarizeStatus(items),
    items,
    services: {
      botcake: {
        status: hasBotcakeCredentials(config) ? "pass" : "warn",
        label: "Botcake",
        message: hasBotcakeCredentials(config) ? "Credentials ready" : "Needs Page ID and token"
      },
      pancakePos: {
        status: hasPancakePosCredentials(config) ? "pass" : "warn",
        label: "Pancake POS",
        message: hasPancakePosCredentials(config) ? "Credentials ready" : "Needs API key and Shop ID"
      },
      draftOrder: {
        status: config.pancakePos.enableDraftOrderCreation ? "warn" : "pass",
        label: "Draft order",
        message: config.pancakePos.enableDraftOrderCreation ? "Enabled with caution" : "Disabled safely"
      }
    }
  };
}

function hasBotcakeCredentials(config: AppConfig): boolean {
  return config.botcake.pageId !== undefined && config.botcake.apiToken !== undefined;
}

function hasPancakePosCredentials(config: AppConfig): boolean {
  return config.pancakePos.apiKey !== undefined && config.pancakePos.shopId !== undefined;
}

function summarizeStatus(items: readonly ReadinessItem[]): ReadinessPayload["overallStatus"] {
  if (items.some((item) => item.status === "fail")) {
    return "fail";
  }

  if (items.some((item) => item.status === "warn")) {
    return "warn";
  }

  return "pass";
}

function resolveStaticPath(pathname: string): string | undefined {
  const normalizedPath = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  const filePath = resolve(join(webRoot, normalizedPath));
  return filePath.startsWith(webRoot) ? filePath : undefined;
}

function sendJson(response: ServerResponse, payload: unknown): void {
  response.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function sendText(response: ServerResponse, statusCode: number, message: string): void {
  response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(message);
}

function contentTypeFor(filePath: string): string {
  switch (extname(filePath)) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".html":
    default:
      return "text/html; charset=utf-8";
  }
}

void main();
