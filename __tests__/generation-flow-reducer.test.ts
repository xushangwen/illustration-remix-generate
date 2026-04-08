import { describe, expect, it, vi } from "vitest";
import { generationFlowReducer, initialGenerationFlowState } from "@/hooks/useGenerationFlow";
import type { AppState } from "@/lib/types";

vi.mock("browser-image-compression", () => ({
  default: vi.fn(async (file: File) => file),
}));

function buildState(overrides: Partial<AppState> = {}): AppState {
  return {
    ...initialGenerationFlowState,
    ...overrides,
  };
}

describe("generationFlowReducer", () => {
  it("clears downstream style, prompt, and result state when a new reference upload starts", () => {
    const previousState = buildState({
      referenceImagePreview: "blob:old-preview",
      referenceImageBase64: "old-base64",
      referenceImageMimeType: "image/png",
      styleKeywords: ["watercolor"],
      styleDescription: "old style",
      styleDescriptionZh: "旧风格",
      backgroundHints: ["paper texture"],
      refinedPrompt: "old prompt",
      refinedPromptZh: "旧描述",
      finalPromptOverride: "manual override",
      aspectRatio: "16:9",
      imageResolution: "4K",
      imageCount: 4,
      backgroundMode: "custom",
      backgroundCustomText: "forest background",
      resultImages: [{ base64: "img", mimeType: "image/png" }],
      pendingCount: 2,
      generationFailures: 1,
      error: "old error",
    });

    const nextState = generationFlowReducer(previousState, {
      type: "START_REFERENCE_UPLOAD",
      payload: { previewUrl: "blob:new-preview" },
    });

    expect(nextState.referenceImagePreview).toBe("blob:new-preview");
    expect(nextState.referenceImageBase64).toBeNull();
    expect(nextState.referenceImageMimeType).toBeNull();
    expect(nextState.styleKeywords).toEqual([]);
    expect(nextState.refinedPrompt).toBe("");
    expect(nextState.finalPromptOverride).toBe("");
    expect(nextState.backgroundHints).toEqual([]);
    expect(nextState.backgroundCustomText).toBe("");
    expect(nextState.resultImages).toEqual([]);
    expect(nextState.pendingCount).toBe(0);
    expect(nextState.generationFailures).toBe(0);
    expect(nextState.loadingStage).toBe("extract");
    expect(nextState.error).toBeNull();

    expect(nextState.aspectRatio).toBe("16:9");
    expect(nextState.imageResolution).toBe("4K");
    expect(nextState.imageCount).toBe(4);
    expect(nextState.backgroundMode).toBe("custom");
  });

  it("records a terminal generation error only when every image fails", () => {
    const failedState = buildState({
      loadingStage: "generate",
      generationFailures: 2,
      pendingCount: 2,
      resultImages: [],
    });

    const finalFailedState = generationFlowReducer(failedState, { type: "FINISH_GENERATE" });

    expect(finalFailedState.loadingStage).toBeNull();
    expect(finalFailedState.pendingCount).toBe(0);
    expect(finalFailedState.error).toBe("图片生成失败，请重试");

    const partialSuccessState = buildState({
      loadingStage: "generate",
      generationFailures: 1,
      pendingCount: 1,
      resultImages: [{ base64: "img", mimeType: "image/png" }],
    });

    const finalPartialSuccessState = generationFlowReducer(partialSuccessState, { type: "FINISH_GENERATE" });

    expect(finalPartialSuccessState.error).toBeNull();
  });
});
