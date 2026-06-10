import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { LogLevel } from "./logger";

export type NodeEnv = "development" | "test" | "production";

export interface AppConfig {
  env: NodeEnv;
  logLevel: LogLevel;
  port: number;
  botcake: BotcakeConfig;
  pancakePos: PancakePosConfig;
}

export interface BotcakeConfig {
  apiBaseUrl: string;
  pageId: string | undefined;
  apiToken: string | undefined;
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
const DEFAULT_PANCAKE_POS_API_BASE_URL = "https://pos.pages.fm/api/v1";

export function loadConfig(env: EnvRecord = loadRuntimeEnv()): AppConfig {
  return {
    env: parseNodeEnv(env.NODE_ENV),
    logLevel: parseLogLevel(env.LOG_LEVEL),
    port: parseNumber(env.APP_PORT, 3000),
    botcake: {
      apiBaseUrl: optionalString(env.BOTCAKE_API_BASE_URL) ?? DEFAULT_BOTCAKE_API_BASE_URL,
      pageId: optionalString(env.BOTCAKE_PAGE_ID),
      apiToken: optionalString(env.BOTCAKE_API_TOKEN),
      webhookSecret: optionalString(env.BOTCAKE_WEBHOOK_SECRET),
      timeoutMs: parseNumber(env.BOTCAKE_DEFAULT_TIMEOUT_MS, 8000),
      retryMaxAttempts: parseNumber(env.BOTCAKE_RETRY_MAX_ATTEMPTS, 3),
      retryBaseDelayMs: parseNumber(env.BOTCAKE_RETRY_BASE_DELAY_MS, 300)
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
    requireValue(issues, "BOTCAKE_PAGE_ID", config.botcake.pageId);
    requireValue(issues, "BOTCAKE_API_TOKEN", config.botcake.apiToken);
    requireValue(issues, "PANCAKE_POS_API_KEY", config.pancakePos.apiKey);
    requireValue(issues, "PANCAKE_POS_SHOP_ID", config.pancakePos.shopId);
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

function requireValue(issues: ConfigIssue[], key: string, value: string | undefined): void {
  if (value === undefined) {
    issues.push({
      level: "error",
      key,
      message: `${key} is required in production.`
    });
  }
}

function optionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === "" ? undefined : trimmed;
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
