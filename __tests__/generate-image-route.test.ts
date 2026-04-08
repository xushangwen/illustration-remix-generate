import { beforeEach, describe, expect, it } from "vitest";
import {
  POST,
  RATE_LIMIT_MAX_REQUESTS,
  isRateLimited,
  resetGenerateImageRateLimitForTests,
  validateGenerateImageRequest,
} from "@/app/api/generate-image/route";

function buildValidRequestBody(overrides: Record<string, unknown> = {}) {
  return {
    refinedPrompt: "a cat on a rooftop",
    styleKeywords: ["watercolor", "soft edges"],
    styleDescription: "Soft watercolor illustration with warm tones",
    aspectRatio: "1:1",
    imageResolution: "2K",
    imageCount: 1,
    backgroundMode: "reference",
    backgroundCustomText: "",
    backgroundHints: [],
    referenceImageBase64: "ZmFrZQ==",
    referenceImageMimeType: "image/png",
    ...overrides,
  };
}

describe("generate-image route validation", () => {
  beforeEach(() => {
    resetGenerateImageRateLimitForTests();
  });

  it("accepts a valid request payload", () => {
    const result = validateGenerateImageRequest(buildValidRequestBody());

    expect(result.error).toBeUndefined();
    expect(result.data).toMatchObject({
      refinedPrompt: "a cat on a rooftop",
      imageCount: 1,
      referenceImageMimeType: "image/png",
    });
  });

  it("rejects unsupported generation counts before hitting the model", async () => {
    const request = new Request("http://localhost/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildValidRequestBody({ imageCount: 8 })),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "不支持的生成数量" });
  });

  it("rejects invalid reference image mime types", () => {
    const result = validateGenerateImageRequest(
      buildValidRequestBody({ referenceImageMimeType: "image/gif" })
    );

    expect(result.error).toBe("参考图格式不受支持，请重新上传参考图");
  });

  it("enforces the in-memory rate limit window", () => {
    for (let index = 0; index < RATE_LIMIT_MAX_REQUESTS; index += 1) {
      expect(isRateLimited("127.0.0.1")).toBe(false);
    }

    expect(isRateLimited("127.0.0.1")).toBe(true);
    expect(isRateLimited("127.0.0.2")).toBe(false);
  });
});
