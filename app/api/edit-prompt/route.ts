import { getGenAI, VISION_MODEL } from "@/lib/gemini";
import { buildEditPromptTemplate } from "@/lib/prompts";
import {
  MAX_CURRENT_PROMPT_LENGTH,
  MAX_EDIT_REQUEST_LENGTH,
  MAX_STYLE_KEYWORDS,
  normalizeStyleKeywords,
  parsePromptResponse,
} from "@/lib/prompt-response";

type EditPromptRequestBody = {
  currentPrompt: string;
  editRequest: string;
  styleKeywords: string[];
};

export function validateEditPromptRequest(body: unknown): { data?: EditPromptRequestBody; error?: string } {
  if (!body || typeof body !== "object") {
    return { error: "请求格式错误" };
  }

  const payload = body as Record<string, unknown>;
  const currentPrompt = typeof payload.currentPrompt === "string" ? payload.currentPrompt.trim() : "";
  const editRequest = typeof payload.editRequest === "string" ? payload.editRequest.trim() : "";
  const styleKeywords = normalizeStyleKeywords(payload.styleKeywords);

  if (!currentPrompt) {
    return { error: "缺少当前 Prompt，请先完成场景描述步骤" };
  }

  if (currentPrompt.length > MAX_CURRENT_PROMPT_LENGTH) {
    return { error: "当前 Prompt 过长，请先精简后再修改" };
  }

  if (!editRequest) {
    return { error: "请输入修改需求" };
  }

  if (editRequest.length > MAX_EDIT_REQUEST_LENGTH) {
    return { error: "修改需求过长，请精简后再试" };
  }

  if (styleKeywords.length > MAX_STYLE_KEYWORDS) {
    return { error: "风格关键词数量过多" };
  }

  return { data: { currentPrompt, editRequest, styleKeywords } };
}

export async function POST(request: Request) {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: "请求格式错误" }, { status: 400 });
  }

  const { data, error } = validateEditPromptRequest(rawBody);
  if (error) {
    return Response.json({ error }, { status: 400 });
  }
  if (!data) {
    return Response.json({ error: "请求格式错误" }, { status: 400 });
  }

  try {
    const { currentPrompt, editRequest, styleKeywords } = data;
    const prompt = buildEditPromptTemplate(currentPrompt, editRequest, styleKeywords ?? []);

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
    console.error("[edit-prompt]", error);
    const message = error instanceof Error ? error.message : "提示词优化失败，请重试";
    return Response.json({ error: message }, { status: 500 });
  }
}
