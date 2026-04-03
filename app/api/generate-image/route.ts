import { genai, IMAGE_GEN_MODEL } from "@/lib/gemini";
import { buildFinalImagePromptWithReference } from "@/lib/prompts";
import { GenerateImageResponse, AspectRatio } from "@/lib/types";

// Vercel 部署时允许最多 120 秒超时（2K 图片生成较慢）
export const maxDuration = 120;

type GenerateParams = Parameters<typeof genai.models.generateContent>[0];

/**
 * 带指数退避的重试包装
 * 针对网络抖动或 Gemini 偶发 500，最多重试 2 次
 */
async function generateWithRetry(params: GenerateParams, maxRetries = 2) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await genai.models.generateContent(params);
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        // 退避：首次 5s，第二次 10s
        await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
        console.warn(`[generate-image] 第 ${attempt + 1} 次失败，重试...`, err);
      }
    }
  }
  throw lastError;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      refinedPrompt,
      styleKeywords,
      styleDescription,
      aspectRatio,
      referenceImageBase64,
      referenceImageMimeType,
    } = body as {
      refinedPrompt: string;
      styleKeywords: string[];
      styleDescription: string;
      aspectRatio: AspectRatio;
      referenceImageBase64: string | null;
      referenceImageMimeType: string | null;
    };

    if (!refinedPrompt?.trim()) {
      return Response.json({ error: "缺少生图 Prompt，请先完成前两步" }, { status: 400 });
    }

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

    const response = await generateWithRetry({
      model: IMAGE_GEN_MODEL,
      contents: [{ role: "user", parts }],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: "2K",
        },
      } as GenerateParams["config"],
    });

    // 从响应中提取图片数据
    const responseParts = response.candidates?.[0]?.content?.parts ?? [];
    let imageBase64: string | null = null;
    let mimeType = "image/png";

    for (const part of responseParts) {
      if (part.inlineData?.data) {
        imageBase64 = part.inlineData.data;
        mimeType = part.inlineData.mimeType ?? "image/png";
        break;
      }
    }

    if (!imageBase64) {
      const textPart = responseParts.find((p) => p.text)?.text;
      console.error("[generate-image] 未获取到图片，模型返回:", textPart);
      throw new Error("图片生成失败，模型未返回图片数据");
    }

    return Response.json({
      imageBase64,
      mimeType,
    } satisfies GenerateImageResponse);
  } catch (error) {
    console.error("[generate-image]", error);
    const message = error instanceof Error ? error.message : "图片生成失败，请重试";
    return Response.json({ error: message }, { status: 500 });
  }
}
