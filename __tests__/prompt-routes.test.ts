import { describe, expect, it } from "vitest";
import { validateEditPromptRequest } from "@/app/api/edit-prompt/route";
import { validateRefinePromptRequest } from "@/app/api/refine-prompt/route";
import {
  MAX_CURRENT_PROMPT_LENGTH,
  MAX_EDIT_REQUEST_LENGTH,
  MAX_USER_DESCRIPTION_LENGTH,
  parsePromptResponse,
} from "@/lib/prompt-response";

describe("prompt route validation", () => {
  it("rejects overly long refine descriptions before calling Gemini", () => {
    const result = validateRefinePromptRequest({
      userDescription: "a".repeat(MAX_USER_DESCRIPTION_LENGTH + 1),
      styleKeywords: ["watercolor"],
    });

    expect(result.error).toBe("场景描述过长，请精简后再试");
  });

  it("rejects overly long edit payloads before calling Gemini", () => {
    const result = validateEditPromptRequest({
      currentPrompt: "a".repeat(MAX_CURRENT_PROMPT_LENGTH + 1),
      editRequest: "b".repeat(MAX_EDIT_REQUEST_LENGTH + 1),
      styleKeywords: ["watercolor"],
    });

    expect(result.error).toBe("当前 Prompt 过长，请先精简后再修改");
  });
});

describe("parsePromptResponse", () => {
  it("parses fenced json responses", () => {
    const result = parsePromptResponse("```json\n{\"prompt\":\"cat\",\"promptZh\":\"猫\"}\n```");

    expect(result).toEqual({ refinedPrompt: "cat", refinedPromptZh: "猫" });
  });

  it("rejects raw text fallbacks", () => {
    expect(() => parsePromptResponse("just some prose")).toThrow();
  });
});
