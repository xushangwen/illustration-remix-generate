import { getGenAI, IMAGE_GEN_MODEL } from "@/lib/gemini";
import { buildFinalImagePromptWithReference } from "@/lib/prompts";
import { GenerateImagesResponse, AspectRatio, ImageResolution, ImageCount } from "@/lib/types";
import type { GoogleGenAI } from "@google/genai";

// 批量生成最多 4 张 4K 图片，保留充足时间
export const maxDuration = 180;

type GenerateParams = Parameters<GoogleGenAI["models"]["generateContent"]>[0];

/**
 * 带指数退避的单次生成（针对偶发网络抖动或 Gemini 500）
 */
async function generateWithRetry(params: GenerateParams, maxRetries = 2) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await getGenAI().models.generateContent(params);
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
        console.warn(`[generate-image] 第 ${attempt + 1} 次失败，重试...`, err);
      }
    }
  }
  throw lastError;
}

/**
 * 从 Gemini 响应中提取图片数据
 * 返回 null 表示该次生成未产出图片
 */
function extractImageFromResponse(response: Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>): {
  imageBase64: string;
  mimeType: string;
} | null {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return {
        imageBase64: part.inlineData.data,
        mimeType: part.inlineData.mimeType ?? "image/png",
      };
    }
  }
  const textPart = parts.find((p) => p.text)?.text;
  console.error("[generate-image] 未获取到图片，模型返回:", textPart);
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      refinedPrompt,
      styleKeywords,
      styleDescription,
      aspectRatio,
      imageResolution,
      imageCount,
      referenceImageBase64,
      referenceImageMimeType,
    } = body as {
      refinedPrompt: string;
      styleKeywords: string[];
      styleDescription: string;
      aspectRatio: AspectRatio;
      imageResolution: ImageResolution;
      imageCount: ImageCount;
      referenceImageBase64: string | null;
      referenceImageMimeType: string | null;
    };

    if (!refinedPrompt?.trim()) {
      return Response.json({ error: "缺少生图 Prompt，请先完成前两步" }, { status: 400 });
    }

    const count = imageCount ?? 1;
    const resolution = imageResolution ?? "2K";

    const textPrompt = buildFinalImagePromptWithReference(refinedPrompt, styleKeywords, styleDescription);

    // 构建 multimodal contents：参考图（垫图）置于文字指令之前
    const parts: object[] = [];
    if (referenceImageBase64 && referenceImageMimeType) {
      parts.push({
        inlineData: {
          mimeType: referenceImageMimeType,
          data: referenceImageBase64,
        },
      });
    }
    parts.push({ text: textPrompt });

    const generateParams: GenerateParams = {
      model: IMAGE_GEN_MODEL,
      contents: [{ role: "user", parts }],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: resolution,
        },
      } as GenerateParams["config"],
    };

    // 并行生成 count 张图片，部分失败不阻断整体返回
    const settled = await Promise.allSettled(
      Array.from({ length: count }, () => generateWithRetry(generateParams))
    );

    const images = settled
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>> =>
        r.status === "fulfilled"
      )
      .map((r) => extractImageFromResponse(r.value))
      .filter((img): img is NonNullable<typeof img> => img !== null);

    if (images.length === 0) {
      throw new Error("图片生成失败，所有请求均未返回图片数据");
    }

    return Response.json({ images } satisfies GenerateImagesResponse);
  } catch (error) {
    console.error("[generate-image]", error);
    const message = error instanceof Error ? error.message : "图片生成失败，请重试";
    return Response.json({ error: message }, { status: 500 });
  }
}
