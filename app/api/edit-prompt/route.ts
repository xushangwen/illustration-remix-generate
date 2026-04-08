import { getGenAI, VISION_MODEL } from "@/lib/gemini";
import { buildEditPromptTemplate } from "@/lib/prompts";
import { RefinePromptResponse } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { currentPrompt, editRequest, styleKeywords } = body as {
      currentPrompt: string;
      editRequest: string;
      styleKeywords: string[];
    };

    if (!currentPrompt?.trim()) {
      return Response.json({ error: "缺少当前 Prompt，请先完成场景描述步骤" }, { status: 400 });
    }

    if (!editRequest?.trim()) {
      return Response.json({ error: "请输入修改需求" }, { status: 400 });
    }

    const prompt = buildEditPromptTemplate(currentPrompt, editRequest, styleKeywords ?? []);

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
    console.error("[edit-prompt]", error);
    const message = error instanceof Error ? error.message : "提示词优化失败，请重试";
    return Response.json({ error: message }, { status: 500 });
  }
}
