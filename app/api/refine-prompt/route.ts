import { getGenAI, VISION_MODEL } from "@/lib/gemini";
import { buildRefinePromptTemplate } from "@/lib/prompts";
import { RefinePromptResponse } from "@/lib/types";

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

    const refinedPrompt = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!refinedPrompt) {
      throw new Error("Gemini 未返回有效的 Prompt");
    }

    return Response.json({ refinedPrompt } satisfies RefinePromptResponse);
  } catch (error) {
    console.error("[refine-prompt]", error);
    const message = error instanceof Error ? error.message : "Prompt 精化失败，请重试";
    return Response.json({ error: message }, { status: 500 });
  }
}
