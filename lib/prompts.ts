// 所有 Gemini Prompt 模板集中管理

/**
 * Step 1: 插画风格提取 Prompt
 * 约束 Gemini 输出严格的 JSON 格式，提取多维度视觉风格特征
 */
export const STYLE_EXTRACTION_PROMPT = `You are a professional illustration style analyst. Analyze this illustration and extract its visual style characteristics.

Return ONLY valid JSON in this exact format, no markdown, no explanation:
{
  "keywords": [
    "flat design",
    "muted earthy tones",
    "loose brush strokes"
  ],
  "description": "A concise one-sentence style summary for use in image generation prompts"
}

Focus on extracting 6-10 keywords covering:
- Color palette (specific hues, saturation level, warmth/coolness)
- Line quality (thick/thin, sketchy/precise, presence of outlines)
- Texture and surface treatment (smooth/rough, paper texture, grain)
- Lighting approach (flat/dramatic/soft/rim light)
- Art movement or era (modernism, art nouveau, retro, contemporary)
- Medium simulation (watercolor, gouache, digital, risograph, oil paint, pencil)
- Compositional tendencies (minimalist, dense, symmetrical, organic)

Output ONLY the JSON object. Do not wrap in code blocks.`;

/**
 * Step 2: 场景描述精化 Prompt
 * 深度理解用户的口语化描述，转化为精准的英文生图 Prompt
 */
export function buildRefinePromptTemplate(
  userDescription: string,
  styleKeywords: string[]
): string {
  return `You are an expert at converting casual scene descriptions into precise image generation prompts for illustration.

Style keywords from reference image: ${styleKeywords.join(", ")}

User's casual description (may be in Chinese or English): "${userDescription}"

Your task:
1. Deeply understand the user's intent — including implied mood, subject relationships, setting, and atmosphere
2. Expand vague references into specific, visually concrete elements
3. Output a single refined image generation prompt in English

Requirements for the output prompt:
- 2-4 sentences, written as a direct visual description
- Include: main subject, action/pose, environment/setting, lighting, mood/atmosphere, compositional framing
- Do NOT include the style keywords (they will be appended separately)
- Do NOT include instructions like "generate" or "create"
- Do NOT add quotation marks or explanation

Return ONLY the refined prompt text, nothing else.`;
}

/**
 * Step 3: 生图 Prompt —— 垫图模式（参考图 + 文字双重约束）
 * 当提供参考图时，在 multimodal contents 中将参考图置于首位，
 * 文字 Prompt 明确要求模型严格复刻其视觉风格
 */
export function buildFinalImagePromptWithReference(
  refinedPrompt: string,
  styleKeywords: string[],
  styleDescription: string
): string {
  // 参考图放在 inlineData part，此处只构建文字部分
  return `The image above is a style reference. Extract ONLY its visual style — art style, color palette, line quality, stroke characteristics, texture, rendering technique, and mood. Ignore any text, watermarks, logos, or signatures present in the reference image entirely.

Do NOT copy the content or subject matter of the reference image. Do NOT reproduce any text or watermarks from it.

Generate a new illustration in exactly this visual style depicting:
${refinedPrompt}

Additional style notes: ${styleDescription}. Key characteristics: ${styleKeywords.join(", ")}.

IMPORTANT: The output image must contain NO text, NO watermarks, NO logos, NO signatures, NO typographic elements of any kind. Pure illustration only.
High quality illustration, 2K resolution.`;
}
