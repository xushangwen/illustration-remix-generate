import { safeParseJSON } from "@/lib/image-utils";
import type { RefinePromptResponse } from "@/lib/types";

export const MAX_STYLE_KEYWORDS = 20;
export const MAX_USER_DESCRIPTION_LENGTH = 1200;
export const MAX_EDIT_REQUEST_LENGTH = 600;
export const MAX_CURRENT_PROMPT_LENGTH = 4000;

export function normalizeStyleKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parsePromptResponse(text: string): RefinePromptResponse {
  const parsed = safeParseJSON<{ prompt?: unknown; promptZh?: unknown }>(text);
  const refinedPrompt = typeof parsed.prompt === "string" ? parsed.prompt.trim() : "";
  const refinedPromptZh = typeof parsed.promptZh === "string" ? parsed.promptZh.trim() : "";

  if (!refinedPrompt) {
    throw new Error("Gemini 未返回有效的 Prompt");
  }

  return { refinedPrompt, refinedPromptZh };
}
