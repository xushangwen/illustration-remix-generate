import { getGenAI, IMAGE_GEN_MODEL } from "@/lib/gemini";
import { buildFinalImagePromptWithReference } from "@/lib/prompts";
import { AspectRatio, ImageResolution, ImageCount, BackgroundMode } from "@/lib/types";
import { isSupportedImageType } from "@/lib/image-utils";
import type { GoogleGenAI } from "@google/genai";

export const maxDuration = 180;

type GenerateParams = Parameters<GoogleGenAI["models"]["generateContent"]>[0];
type GenerateRequestBody = {
  refinedPrompt: string;
  styleKeywords: string[];
  styleDescription: string;
  aspectRatio: AspectRatio;
  imageResolution: ImageResolution;
  imageCount: ImageCount;
  backgroundMode: BackgroundMode;
  backgroundCustomText: string;
  backgroundHints: string[];
  referenceImageBase64: string;
  referenceImageMimeType: string;
  finalPromptOverride?: string;
};

const ALLOWED_ASPECT_RATIOS = new Set<AspectRatio>(["16:9", "1:1", "9:16"]);
const ALLOWED_IMAGE_RESOLUTIONS = new Set<ImageResolution>(["1K", "2K", "4K"]);
const ALLOWED_IMAGE_COUNTS = new Set<ImageCount>([1, 2, 4]);
const ALLOWED_BACKGROUND_MODES = new Set<BackgroundMode>(["reference", "clean", "isolated", "custom"]);
const MAX_REFINED_PROMPT_LENGTH = 2000;
const MAX_FINAL_PROMPT_LENGTH = 8000;
const MAX_BACKGROUND_TEXT_LENGTH = 300;
const MAX_STYLE_KEYWORDS = 20;
export const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
export const RATE_LIMIT_MAX_REQUESTS = 6;
const generateRequestLog = new Map<string, number[]>();

async function generateWithRetry(params: GenerateParams, maxRetries = 2) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await getGenAI().models.generateContent(params);
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
        console.warn(`[generate-image] 第 ${attempt + 1} 次失败，重试...`);
      }
    }
  }
  throw lastError;
}

function extractImageFromResponse(
  response: Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>
) {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return { imageBase64: part.inlineData.data, mimeType: part.inlineData.mimeType ?? "image/png" };
    }
  }
  return null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "图片生成失败";
}

function getClientId(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function isRateLimited(clientId: string): boolean {
  const now = Date.now();
  const recentRequests = (generateRequestLog.get(clientId) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );
  recentRequests.push(now);
  generateRequestLog.set(clientId, recentRequests);
  return recentRequests.length > RATE_LIMIT_MAX_REQUESTS;
}

export function validateGenerateImageRequest(body: unknown): { data?: GenerateRequestBody; error?: string } {
  if (!body || typeof body !== "object") {
    return { error: "请求格式错误" };
  }

  const payload = body as Record<string, unknown>;
  const refinedPrompt = typeof payload.refinedPrompt === "string" ? payload.refinedPrompt.trim() : "";
  const styleKeywords = isStringArray(payload.styleKeywords)
    ? payload.styleKeywords.map((keyword) => keyword.trim()).filter(Boolean)
    : [];
  const styleDescription = typeof payload.styleDescription === "string" ? payload.styleDescription.trim() : "";
  const backgroundCustomText =
    typeof payload.backgroundCustomText === "string" ? payload.backgroundCustomText.trim() : "";
  const backgroundHints = isStringArray(payload.backgroundHints)
    ? payload.backgroundHints.map((hint) => hint.trim()).filter(Boolean)
    : [];
  const referenceImageBase64 =
    typeof payload.referenceImageBase64 === "string" ? payload.referenceImageBase64.trim() : "";
  const referenceImageMimeType =
    typeof payload.referenceImageMimeType === "string" ? payload.referenceImageMimeType.trim() : "";
  const finalPromptOverride =
    typeof payload.finalPromptOverride === "string" ? payload.finalPromptOverride.trim() : "";

  if (!ALLOWED_ASPECT_RATIOS.has(payload.aspectRatio as AspectRatio)) {
    return { error: "不支持的图片比例" };
  }

  if (!ALLOWED_IMAGE_RESOLUTIONS.has(payload.imageResolution as ImageResolution)) {
    return { error: "不支持的图片分辨率" };
  }

  if (!ALLOWED_IMAGE_COUNTS.has(payload.imageCount as ImageCount)) {
    return { error: "不支持的生成数量" };
  }

  if (!ALLOWED_BACKGROUND_MODES.has(payload.backgroundMode as BackgroundMode)) {
    return { error: "不支持的背景模式" };
  }

  if (!referenceImageBase64 || !referenceImageMimeType) {
    return { error: "缺少参考图数据，请重新上传参考图" };
  }

  if (!isSupportedImageType(referenceImageMimeType)) {
    return { error: "参考图格式不受支持，请重新上传参考图" };
  }

  if (!refinedPrompt && !finalPromptOverride) {
    return { error: "缺少生图 Prompt" };
  }

  if (!finalPromptOverride && styleKeywords.length === 0) {
    return { error: "缺少风格关键词，请重新上传参考图" };
  }

  if (styleKeywords.length > MAX_STYLE_KEYWORDS) {
    return { error: "风格关键词数量过多" };
  }

  if (refinedPrompt.length > MAX_REFINED_PROMPT_LENGTH) {
    return { error: "场景描述过长，请精简后再试" };
  }

  if (finalPromptOverride.length > MAX_FINAL_PROMPT_LENGTH) {
    return { error: "最终生图指令过长，请精简后再试" };
  }

  if (backgroundCustomText.length > MAX_BACKGROUND_TEXT_LENGTH) {
    return { error: "自定义背景描述过长，请精简后再试" };
  }

  return {
    data: {
      refinedPrompt,
      styleKeywords,
      styleDescription,
      aspectRatio: payload.aspectRatio as AspectRatio,
      imageResolution: payload.imageResolution as ImageResolution,
      imageCount: payload.imageCount as ImageCount,
      backgroundMode: payload.backgroundMode as BackgroundMode,
      backgroundCustomText,
      backgroundHints,
      referenceImageBase64,
      referenceImageMimeType,
      finalPromptOverride: finalPromptOverride || undefined,
    },
  };
}

export async function POST(request: Request) {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: "请求格式错误" }, { status: 400 });
  }

  const { data, error } = validateGenerateImageRequest(rawBody);
  if (error) {
    return Response.json({ error }, { status: 400 });
  }
  if (!data) {
    return Response.json({ error: "请求格式错误" }, { status: 400 });
  }

  const clientId = getClientId(request);
  if (isRateLimited(clientId)) {
    return Response.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 });
  }

  const {
    refinedPrompt, styleKeywords, styleDescription,
    aspectRatio, imageResolution, imageCount,
    backgroundMode, backgroundCustomText, backgroundHints,
    referenceImageBase64, referenceImageMimeType,
    finalPromptOverride,
  } = data;

  // 若用户在预览卡片中手动修改了最终指令，直接使用；否则自动计算
  const textPrompt = finalPromptOverride
    ? finalPromptOverride
    : buildFinalImagePromptWithReference(
        refinedPrompt,
        styleKeywords,
        styleDescription,
        backgroundMode,
        backgroundCustomText,
        backgroundHints
      );

  const parts: object[] = [];
  parts.push({ inlineData: { mimeType: referenceImageMimeType, data: referenceImageBase64 } });
  parts.push({ text: textPrompt });

  const generateParams: GenerateParams = {
    model: IMAGE_GEN_MODEL,
    contents: [{ role: "user", parts }],
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio, imageSize: imageResolution },
    } as GenerateParams["config"],
  };

  const encoder = new TextEncoder();

  // SSE 流：每张图片生成完毕立刻推送，无需等待全部完成
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object | "[DONE]") => {
        const payload = data === "[DONE]" ? "[DONE]" : JSON.stringify(data);
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      };

      try {
        await Promise.allSettled(
          Array.from({ length: imageCount }, async (_, index) => {
            try {
              const result = await generateWithRetry(generateParams);
              const image = extractImageFromResponse(result);
              if (image) send({ index, ...image });
              else send({ index, error: "no_image", message: "模型未返回图片" });
            } catch (err) {
              console.error(`[generate-image] 第 ${index + 1} 张失败:`, err);
              send({ index, error: "failed", message: toErrorMessage(err) });
            }
          })
        );
      } finally {
        send("[DONE]");
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no", // 禁止 Nginx 缓冲，确保实时推送
    },
  });
}

export function resetGenerateImageRateLimitForTests(): void {
  generateRequestLog.clear();
}
