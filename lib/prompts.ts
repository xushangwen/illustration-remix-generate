// 所有 Gemini Prompt 模板集中管理
import type { BackgroundMode } from "./types";

/**
 * Step 1: 插画风格提取
 * 新增 backgroundHints：单独识别背景相关元素，供用户感知并在生成设置中控制
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
  "descriptionZh": "用一句简洁的中文描述这张插画的视觉风格特征",
  "backgroundHints": ["kraft paper texture", "warm beige background"]
}

For the "keywords" field, focus on the SUBJECT's rendering style (6-10 keywords):
- Color palette of the subject itself
- Line quality and stroke characteristics
- Texture and surface treatment of the subject
- Lighting and shadow approach
- Art movement or medium (watercolor, gouache, risograph, etc.)
- Compositional tendencies

For the "backgroundHints" field, list ONLY elements that belong to the background/environment context
(paper texture, background color, backdrop patterns, environmental textures, vignette effects).
If there are no notable background elements, return an empty array [].

Output ONLY the JSON object. Do not wrap in code blocks.`;

/**
 * Step 2: 场景描述精化（输出中英双语 JSON）
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
 * Step 2 扩展: 在已有 Prompt 基础上按用户描述修改（输出中英双语 JSON）
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
 * 根据背景模式生成背景覆盖指令
 * clean / isolated / custom 模式下，明确告知模型不要复刻参考图背景
 */
function buildBackgroundInstruction(
  mode: BackgroundMode,
  customText: string,
  backgroundHints: string[]
): string {
  // 有检测到背景元素时，用于明确排除
  const hintsNote =
    backgroundHints.length > 0
      ? ` (Do NOT replicate these background elements from the reference: ${backgroundHints.join(", ")})`
      : "";

  switch (mode) {
    case "reference":
      // 参照原图：不做额外限制
      return "";
    case "clean":
      return `\nBackground: clean white or very light neutral background. Solid, minimal, no texture.${hintsNote}`;
    case "isolated":
      return `\nBackground: completely transparent / no background. Subject only, fully isolated, suitable for sticker or icon use. No background elements whatsoever.${hintsNote}`;
    case "custom":
      return customText.trim()
        ? `\nBackground: ${customText.trim()}.${hintsNote}`
        : `\nBackground: clean, minimal.${hintsNote}`;
  }
}

/**
 * Step 3: 生图 Prompt —— 垫图模式（参考图 + 文字双重约束）
 * backgroundMode 非 reference 时，主动过滤背景关键词并注入背景覆盖指令
 */
export function buildFinalImagePromptWithReference(
  refinedPrompt: string,
  styleKeywords: string[],
  styleDescription: string,
  backgroundMode: BackgroundMode = "reference",
  backgroundCustomText: string = "",
  backgroundHints: string[] = []
): string {
  // 非"参照原图"模式：从关键词中过滤掉背景相关词，避免背景元素通过关键词通道污染生图
  const filteredKeywords =
    backgroundMode === "reference"
      ? styleKeywords
      : styleKeywords.filter(
          (kw) => !backgroundHints.some((hint) => kw.toLowerCase().includes(hint.toLowerCase().split(" ")[0]))
        );

  const backgroundInstruction = buildBackgroundInstruction(
    backgroundMode,
    backgroundCustomText,
    backgroundHints
  );

  return `The image above is a style reference. Extract ONLY the subject's rendering style — art technique, color palette of the subject, line quality, stroke characteristics, texture of the subject, rendering method, and mood. Ignore any text, watermarks, logos, or signatures entirely.

Do NOT copy the content or subject matter of the reference image. Do NOT reproduce any text or watermarks from it.${backgroundMode !== "reference" ? "\nDo NOT replicate the background, paper texture, or backdrop from the reference image." : ""}

Generate a new illustration in exactly this visual style depicting:
${refinedPrompt}

Style notes: ${styleDescription}. Key characteristics: ${filteredKeywords.join(", ")}.${backgroundInstruction}

IMPORTANT: The output image must contain NO text, NO watermarks, NO logos, NO signatures, NO typographic elements of any kind. Pure illustration only.`;
}
