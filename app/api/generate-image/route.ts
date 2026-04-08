import { getGenAI, IMAGE_GEN_MODEL } from "@/lib/gemini";
import { buildFinalImagePromptWithReference } from "@/lib/prompts";
import { AspectRatio, ImageResolution, ImageCount } from "@/lib/types";
import type { GoogleGenAI } from "@google/genai";

export const maxDuration = 180;

type GenerateParams = Parameters<GoogleGenAI["models"]["generateContent"]>[0];

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

export async function POST(request: Request) {
  let body: {
    refinedPrompt: string;
    styleKeywords: string[];
    styleDescription: string;
    aspectRatio: AspectRatio;
    imageResolution: ImageResolution;
    imageCount: ImageCount;
    referenceImageBase64: string | null;
    referenceImageMimeType: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "请求格式错误" }, { status: 400 });
  }

  const {
    refinedPrompt, styleKeywords, styleDescription,
    aspectRatio, imageResolution, imageCount,
    referenceImageBase64, referenceImageMimeType,
  } = body;

  if (!refinedPrompt?.trim()) {
    return Response.json({ error: "缺少生图 Prompt" }, { status: 400 });
  }

  const count = imageCount ?? 1;
  const resolution = imageResolution ?? "2K";

  const textPrompt = buildFinalImagePromptWithReference(refinedPrompt, styleKeywords, styleDescription);

  const parts: object[] = [];
  if (referenceImageBase64 && referenceImageMimeType) {
    parts.push({ inlineData: { mimeType: referenceImageMimeType, data: referenceImageBase64 } });
  }
  parts.push({ text: textPrompt });

  const generateParams: GenerateParams = {
    model: IMAGE_GEN_MODEL,
    contents: [{ role: "user", parts }],
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio, imageSize: resolution },
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
          Array.from({ length: count }, async (_, index) => {
            try {
              const result = await generateWithRetry(generateParams);
              const image = extractImageFromResponse(result);
              if (image) send({ index, ...image });
              else send({ index, error: "no_image" });
            } catch (err) {
              console.error(`[generate-image] 第 ${index + 1} 张失败:`, err);
              send({ index, error: "failed" });
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
