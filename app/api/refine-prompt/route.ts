import { getGenAI, VISION_MODEL } from "@/lib/gemini";
import { buildRefinePromptTemplate } from "@/lib/prompts";
import { RefinePromptResponse } from "@/lib/types";
import { safeParseJSON } from "@/lib/image-utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userDescription, styleKeywords } = body as {
      userDescription: string;
      styleKeywords: string[];
    };

    if (!userDescription?.trim()) {
      return Response.json({ error: "请输入场景描述" }, { status: 400 });
    }

    if (!styleKeywords || styleKeywords.length === 0) {
      return Response.json({ error: "缺少风格关键词，请先完成第一步" }, { status: 400 });
    }

    const prompt = buildRefinePromptTemplate(userDescription, styleKeywords);

    const response = await getGenAI().models.generateContent({
      model: VISION_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!rawText) {
      throw new Error("Gemini 未返回有效内容");
    }

    // 解析 JSON，兼容模型偶尔返回 markdown 代码块的情况
    let refinedPrompt = "";
    let refinedPromptZh = "";

    try {
      const parsed = safeParseJSON<{ prompt: string; promptZh: string }>(rawText);
      refinedPrompt = parsed.prompt?.trim() ?? "";
      refinedPromptZh = parsed.promptZh?.trim() ?? "";
    } catch {
      // 解析失败时退回为纯文本（向后兼容）
      refinedPrompt = rawText;
      refinedPromptZh = "";
    }

    if (!refinedPrompt) {
      throw new Error("Gemini 未返回有效的 Prompt");
    }

    return Response.json({ refinedPrompt, refinedPromptZh } satisfies RefinePromptResponse);
  } catch (error) {
    console.error("[refine-prompt]", error);
    const message = error instanceof Error ? error.message : "Prompt 精化失败，请重试";
    return Response.json({ error: message }, { status: 500 });
  }
}
