import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createAppError, type AppError } from "../utils/errors";
import { fail, ok, type Result } from "../utils/result";

export async function loadSystemPrompt(promptPath = resolve(process.cwd(), "prompts", "system-prompt.txt")): Promise<Result<string, AppError>> {
  try {
    const content = await readFile(promptPath, "utf8");
    const prompt = content.trim();

    if (prompt === "") {
      return fail(createAppError({
        code: "CONFIG_INVALID",
        message: "System prompt file is empty.",
        retryable: false,
        details: { promptPath }
      }));
    }

    return ok(prompt);
  } catch (error) {
    return fail(createAppError({
      code: "CONFIG_INVALID",
      message: "Unable to read system prompt file.",
      retryable: false,
      details: {
        promptPath,
        error: error instanceof Error ? error.message : String(error)
      }
    }));
  }
}
