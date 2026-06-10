import { loadSystemPrompt } from "./ai/prompt-loader";
import { loadConfig, validateConfig } from "./utils/config";
import { createLogger } from "./utils/logger";

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({ level: config.logLevel });
  const issues = validateConfig(config);
  const prompt = await loadSystemPrompt();

  logger.info("ai_sales_automation_bootstrap", {
    env: config.env,
    configIssueCount: issues.length,
    promptLoaded: prompt.ok,
    botcakeConfigured: config.botcake.pageId !== undefined && config.botcake.apiToken !== undefined,
    pancakePosConfigured: config.pancakePos.apiKey !== undefined && config.pancakePos.shopId !== undefined,
    draftOrderEnabled: config.pancakePos.enableDraftOrderCreation
  });

  for (const issue of issues) {
    logger.warn("config_issue", { issue });
  }

  if (!prompt.ok) {
    logger.error("prompt_load_failed", { error: prompt.error });
  }
}

void main();
