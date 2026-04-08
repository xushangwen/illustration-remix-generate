import { getGenAI, VISION_MODEL } from "@/lib/gemini";
import { STYLE_EXTRACTION_PROMPT } from "@/lib/prompts";
import { safeParseJSON, isSupportedImageType } from "@/lib/image-utils";
import { ExtractStyleResponse } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return Response.json({ error: "请上传参考图片" }, { status: 400 });
    }

    if (!isSupportedImageType(imageFile.type)) {
      return Response.json(
        { error: "不支持的图片格式，请上传 JPG、PNG 或 WebP" },
        { status: 400 }
      );
    }

    // 将图片转为 base64 供 Gemini inline data 使用
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const response = await getGenAI().models.generateContent({
      model: VISION_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: imageFile.type,
                data: base64,
              },
            },
            { text: STYLE_EXTRACTION_PROMPT },
          ],
        },
      ],
    });

    const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error("Gemini 未返回有效内容");
    }

    const parsed = safeParseJSON<ExtractStyleResponse>(rawText);

    if (!parsed.keywords || !Array.isArray(parsed.keywords)) {
      throw new Error("风格分析结果格式异常");
    }

    return Response.json({
      keywords: parsed.keywords,
      description: parsed.description ?? "",
      descriptionZh: parsed.descriptionZh ?? "",
    } satisfies ExtractStyleResponse);
  } catch (error) {
    console.error("[extract-style]", error);
    const message = error instanceof Error ? error.message : "风格分析失败，请重试";
    return Response.json({ error: message }, { status: 500 });
  }
}
