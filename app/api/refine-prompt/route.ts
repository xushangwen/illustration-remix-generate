import { getGenAI, VISION_MODEL } from "@/lib/gemini";
import { buildRefinePromptTemplate } from "@/lib/prompts";
import { MAX_STYLE_KEYWORDS, MAX_USER_DESCRIPTION_LENGTH, normalizeStyleKeywords, parsePromptResponse } from "@/lib/prompt-response";

type RefinePromptRequestBody = {
  userDescription: string;
  styleKeywords: string[];
};

export function validateRefinePromptRequest(body: unknown): { data?: RefinePromptRequestBody; error?: string } {
  if (!body || typeof body !== "object") {
    return { error: "请求格式错误" };
  }

  const payload = body as Record<string, unknown>;
  const userDescription = typeof payload.userDescription === "string" ? payload.userDescription.trim() : "";
  const styleKeywords = normalizeStyleKeywords(payload.styleKeywords);

  if (!userDescription) {
    return { error: "请输入场景描述" };
  }

  if (userDescription.length > MAX_USER_DESCRIPTION_LENGTH) {
    return { error: "场景描述过长，请精简后再试" };
  }

  if (styleKeywords.length === 0) {
    return { error: "缺少风格关键词，请先完成第一步" };
  }

  if (styleKeywords.length > MAX_STYLE_KEYWORDS) {
    return { error: "风格关键词数量过多" };
  }

  return { data: { userDescription, styleKeywords } };
}

export async function POST(request: Request) {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: "请求格式错误" }, { status: 400 });
  }

  const { data, error } = validateRefinePromptRequest(rawBody);
  if (error) {
    return Response.json({ error }, { status: 400 });
  }
  if (!data) {
    return Response.json({ error: "请求格式错误" }, { status: 400 });
  }

  try {
    const { userDescription, styleKeywords } = data;
    const prompt = buildRefinePromptTemplate(userDescription, styleKeywords);

    const response = await getGenAI().models.generateContent({
      model: VISION_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!rawText) {
      throw new Error("Gemini 未返回有效内容");
    }

    return Response.json(parsePromptResponse(rawText));
  } catch (error) {
    console.error("[refine-prompt]", error);
    const message = error instanceof Error ? error.message : "Prompt 精化失败，请重试";
    return Response.json({ error: message }, { status: 500 });
  }
}
