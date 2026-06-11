import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { LogLevel } from "./logger";

export type NodeEnv = "development" | "test" | "production";

export interface AppConfig {
  env: NodeEnv;
  logLevel: LogLevel;
  port: number;
  botcake: BotcakeConfig;
  pancakeApi: PancakeApiConfig;
  pancakePos: PancakePosConfig;
}

export interface BotcakeConfig {
  apiBaseUrl: string;
  pageId: string | undefined;
  pageIdSource: BotcakePageIdSource;
  apiToken: string | undefined;
  webhookSecret: string | undefined;
  timeoutMs: number;
  retryMaxAttempts: number;
  retryBaseDelayMs: number;
}

export type BotcakePageIdSource = "env" | "token" | "missing";

export interface PancakeApiConfig {
  userBaseUrl: string;
  publicBaseUrl: string;
  publicV2BaseUrl: string;
  userAccessToken: string | undefined;
  pageAccessToken: string | undefined;
  pageId: string | undefined;
  webhookSecret: string | undefined;
  timeoutMs: number;
  retryMaxAttempts: number;
  retryBaseDelayMs: number;
}

export interface PancakePosConfig {
  apiBaseUrl: string;
  apiKey: string | undefined;
  shopId: string | undefined;
  defaultWarehouseId: string | undefined;
  timeoutMs: number;
  retryMaxAttempts: number;
  retryBaseDelayMs: number;
  enableDraftOrderCreation: boolean;
  safeDraftStatuses: readonly number[];
}

export interface ConfigIssue {
  level: "warning" | "error";
  key: string;
  message: string;
}

type EnvRecord = Record<string, string | undefined>;

const DEFAULT_BOTCAKE_API_BASE_URL = "https://botcake.io/api/public_api/v1";
const DEFAULT_PANCAKE_API_USER_BASE_URL = "https://pages.fm/api/v1";
const DEFAULT_PANCAKE_API_PUBLIC_BASE_URL = "https://pages.fm/api/public_api/v1";
const DEFAULT_PANCAKE_API_PUBLIC_V2_BASE_URL = "https://pages.fm/api/public_api/v2";
const DEFAULT_PANCAKE_POS_API_BASE_URL = "https://pos.pages.fm/api/v1";

export function loadConfig(env: EnvRecord = loadRuntimeEnv()): AppConfig {
  const botcakeApiToken = optionalString(env.BOTCAKE_API_TOKEN);
  const explicitBotcakePageId = optionalString(env.BOTCAKE_PAGE_ID);
  const inferredBotcakePageId = inferBotcakePageIdFromToken(botcakeApiToken);
  const botcakePageId = explicitBotcakePageId ?? inferredBotcakePageId;

  return {
    env: parseNodeEnv(env.NODE_ENV),
    logLevel: parseLogLevel(env.LOG_LEVEL),
    port: parseNumber(env.APP_PORT, 3000),
    botcake: {
      apiBaseUrl: optionalString(env.BOTCAKE_API_BASE_URL) ?? DEFAULT_BOTCAKE_API_BASE_URL,
      pageId: botcakePageId,
      pageIdSource: resolveBotcakePageIdSource(explicitBotcakePageId, inferredBotcakePageId),
      apiToken: botcakeApiToken,
      webhookSecret: optionalString(env.BOTCAKE_WEBHOOK_SECRET),
      timeoutMs: parseNumber(env.BOTCAKE_DEFAULT_TIMEOUT_MS, 8000),
      retryMaxAttempts: parseNumber(env.BOTCAKE_RETRY_MAX_ATTEMPTS, 3),
      retryBaseDelayMs: parseNumber(env.BOTCAKE_RETRY_BASE_DELAY_MS, 300)
    },
    pancakeApi: {
      userBaseUrl: optionalString(env.PANCAKE_API_USER_BASE_URL) ?? DEFAULT_PANCAKE_API_USER_BASE_URL,
      publicBaseUrl: optionalString(env.PANCAKE_API_BASE_URL) ?? DEFAULT_PANCAKE_API_PUBLIC_BASE_URL,
      publicV2BaseUrl: optionalString(env.PANCAKE_API_V2_BASE_URL) ?? DEFAULT_PANCAKE_API_PUBLIC_V2_BASE_URL,
      userAccessToken: optionalString(env.PANCAKE_API_USER_ACCESS_TOKEN),
      pageAccessToken: optionalString(env.PANCAKE_API_PAGE_ACCESS_TOKEN),
      pageId: optionalString(env.PANCAKE_API_PAGE_ID),
      webhookSecret: optionalString(env.PANCAKE_WEBHOOK_SECRET),
      timeoutMs: parseNumber(env.PANCAKE_API_TIMEOUT_MS, 10000),
      retryMaxAttempts: parseNumber(env.PANCAKE_API_RETRY_MAX_ATTEMPTS, 3),
      retryBaseDelayMs: parseNumber(env.PANCAKE_API_RETRY_BASE_DELAY_MS, 500)
    },
    pancakePos: {
      apiBaseUrl: optionalString(env.PANCAKE_POS_API_BASE_URL) ?? DEFAULT_PANCAKE_POS_API_BASE_URL,
      apiKey: optionalString(env.PANCAKE_POS_API_KEY),
      shopId: optionalString(env.PANCAKE_POS_SHOP_ID),
      defaultWarehouseId: optionalString(env.PANCAKE_POS_DEFAULT_WAREHOUSE_ID),
      timeoutMs: parseNumber(env.PANCAKE_POS_TIMEOUT_MS, 10000),
      retryMaxAttempts: parseNumber(env.PANCAKE_POS_RETRY_MAX_ATTEMPTS, 3),
      retryBaseDelayMs: parseNumber(env.PANCAKE_POS_RETRY_BASE_DELAY_MS, 500),
      enableDraftOrderCreation: parseBoolean(env.ENABLE_POS_DRAFT_ORDER, false),
      safeDraftStatuses: parseNumberList(env.PANCAKE_POS_SAFE_DRAFT_STATUSES)
    }
  };
}

export function loadRuntimeEnv(envFilePath = resolve(process.cwd(), ".env")): EnvRecord {
  const fileEnv = readDotEnvFile(envFilePath);
  return {
    ...fileEnv,
    ...process.env
  };
}

export function validateConfig(config: AppConfig): ConfigIssue[] {
  const issues: ConfigIssue[] = [];

  if (config.env === "production") {
    requireValue(issues, "BOTCAKE_PAGE_ID or token-derived page id", config.botcake.pageId);
    requireValue(issues, "BOTCAKE_API_TOKEN", config.botcake.apiToken);
    requireValue(issues, "PANCAKE_POS_API_KEY", config.pancakePos.apiKey);
    requireValue(issues, "PANCAKE_POS_SHOP_ID", config.pancakePos.shopId);

    if (config.pancakeApi.pageAccessToken !== undefined && config.pancakeApi.pageId === undefined) {
      issues.push({
        level: "error",
        key: "PANCAKE_API_PAGE_ID",
        message: "PANCAKE_API_PAGE_ID is required when PANCAKE_API_PAGE_ACCESS_TOKEN is configured."
      });
    }
  }

  if (config.pancakePos.enableDraftOrderCreation) {
    if (config.pancakePos.safeDraftStatuses.length === 0) {
      issues.push({
        level: "error",
        key: "PANCAKE_POS_SAFE_DRAFT_STATUSES",
        message: "Draft order creation is enabled but no safe draft statuses are configured."
      });
    }

    if (config.pancakePos.safeDraftStatuses.includes(1)) {
      issues.push({
        level: "error",
        key: "PANCAKE_POS_SAFE_DRAFT_STATUSES",
        message: "Status 1 is confirmed order and must never be used as draft."
      });
    }
  }

  return issues;
}

export function inferBotcakePageIdFromToken(token: string | undefined): string | undefined {
  const trimmed = optionalString(token);
  if (trimmed === undefined) {
    return undefined;
  }

  const [, payload] = trimmed.split(".");
  if (payload === undefined) {
    return undefined;
  }

  try {
    const decoded = JSON.parse(decodeBase64Url(payload)) as unknown;
    if (!isRecord(decoded)) {
      return undefined;
    }

    const id = decoded.id;
    if (typeof id === "string" && id.trim() !== "") {
      return id.trim();
    }

    if (typeof id === "number" && Number.isFinite(id)) {
      return String(id);
    }

    return undefined;
  } catch {
    return undefined;
  }
}

function requireValue(issues: ConfigIssue[], key: string, value: string | undefined): void {
  if (value === undefined) {
    issues.push({
      level: "error",
      key,
      message: `${key} is required in production.`
    });
  }
}

function resolveBotcakePageIdSource(
  explicitPageId: string | undefined,
  inferredPageId: string | undefined
): BotcakePageIdSource {
  if (explicitPageId !== undefined) {
    return "env";
  }

  if (inferredPageId !== undefined) {
    return "token";
  }

  return "missing";
}

function optionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === "" ? undefined : trimmed;
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(paddingLength);
  return Buffer.from(padded, "base64").toString("utf8");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseNumber(value: string | undefined, fallback: number): number {
  const trimmed = optionalString(value);
  if (trimmed === undefined) {
    return fallback;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNumberList(value: string | undefined): readonly number[] {
  const trimmed = optionalString(value);
  if (trimmed === undefined) {
    return [];
  }

  return trimmed
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item));
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  const trimmed = optionalString(value);
  if (trimmed === undefined) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(trimmed.toLowerCase());
}

function parseNodeEnv(value: string | undefined): NodeEnv {
  if (value === "test" || value === "production") {
    return value;
  }

  return "development";
}

function parseLogLevel(value: string | undefined): LogLevel {
  if (value === "debug" || value === "warn" || value === "error") {
    return value;
  }

  return "info";
}

function readDotEnvFile(envFilePath: string): EnvRecord {
  if (!existsSync(envFilePath)) {
    return {};
  }

  const content = readFileSync(envFilePath, "utf8");
  const output: EnvRecord = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    output[key] = stripOptionalQuotes(value);
  }

  return output;
}

function stripOptionalQuotes(value: string): string {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
