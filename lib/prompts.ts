// 所有 Gemini Prompt 模板集中管理

/**
 * Step 1: 插画风格提取
 * 增加 descriptionZh 字段，中文风格摘要直接随分析结果一起返回
 */
export const STYLE_EXTRACTION_PROMPT = `You are a professional illustration style analyst. Analyze this illustration and extract its visual style characteristics.

Return ONLY valid JSON in this exact format, no markdown, no explanation:
{
  "keywords": [
    "flat design",
    "muted earthy tones",
    "loose brush strokes"
  ],
  "description": "A concise one-sentence style summary for use in image generation prompts",
  "descriptionZh": "用一句简洁的中文描述这张插画的视觉风格特征"
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
 * Step 2: 场景描述精化
 * 输出 JSON，同时包含英文生图 Prompt 和中文对照说明
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
3. Output results in JSON format with both English prompt and Chinese explanation

Return ONLY valid JSON in this exact format, no markdown, no explanation:
{
  "prompt": "The refined English image generation prompt (2-4 sentences, direct visual description, include: main subject, action/pose, environment/setting, lighting, mood, framing. Do NOT include style keywords or instructions like generate/create.)",
  "promptZh": "用自然中文描述画面内容（同 prompt 对应，方便用户确认意图是否正确，无需逐字翻译，但要准确传达画面）"
}

Output ONLY the JSON object. Do not wrap in code blocks.`;
}

/**
 * Step 2 扩展: 在已有 Prompt 基础上按用户描述修改
 * 输出 JSON，同时包含修改后的英文 Prompt 和中文对照
 */
export function buildEditPromptTemplate(
  currentPrompt: string,
  editRequest: string,
  styleKeywords: string[]
): string {
  return `You are an expert at refining image generation prompts for illustration.

Current prompt:
"${currentPrompt}"

Style keywords from reference image: ${styleKeywords.join(", ")}

User's modification request (may be in Chinese or English): "${editRequest}"

Your task:
1. Understand the user's modification intent precisely
2. Modify the current prompt according to the request only
3. Keep all unchanged parts intact — only modify what was explicitly requested
4. Maintain the same level of detail and style compatibility

Return ONLY valid JSON in this exact format, no markdown, no explanation:
{
  "prompt": "The modified English prompt (2-4 sentences, direct visual description. Do NOT include style keywords or instructions like generate/create.)",
  "promptZh": "用自然中文描述修改后的画面内容"
}

Output ONLY the JSON object. Do not wrap in code blocks.`;
}

/**
 * Step 3: 生图 Prompt —— 垫图模式
 * 参考图 base64 作为 multimodal inlineData，置于文字 Prompt 之前
 * 双重约束：视觉参考图锁定风格，关键词文字进一步加强风格特征
 */
export function buildFinalImagePromptWithReference(
  refinedPrompt: string,
  styleKeywords: string[],
  styleDescription: string
): string {
  return `The image above is a style reference. Extract ONLY its visual style — art style, color palette, line quality, stroke characteristics, texture, rendering technique, and mood. Ignore any text, watermarks, logos, or signatures present in the reference image entirely.

Do NOT copy the content or subject matter of the reference image. Do NOT reproduce any text or watermarks from it.

Generate a new illustration in exactly this visual style depicting:
${refinedPrompt}

Additional style notes: ${styleDescription}. Key characteristics: ${styleKeywords.join(", ")}.

IMPORTANT: The output image must contain NO text, NO watermarks, NO logos, NO signatures, NO typographic elements of any kind. Pure illustration only.`;
}
