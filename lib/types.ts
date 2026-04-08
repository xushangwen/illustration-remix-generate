export type AspectRatio = "16:9" | "1:1" | "9:16";
export type ImageResolution = "1K" | "2K" | "4K";
export type ImageCount = 1 | 2 | 4;
export type LoadingStage = "extract" | "refine" | "edit" | "generate" | null;

// 背景处理模式
// reference: 完全参照原图（默认，原有行为）
// clean:     白色/干净背景，过滤背景关键词
// isolated:  无背景/透明，适合图标/sticker
// custom:    用户自定义描述
export type BackgroundMode = "reference" | "clean" | "isolated" | "custom";

export interface ResultImage {
  base64: string;
  mimeType: string;
}

export interface AppState {
  // 参考图
  referenceImagePreview: string | null;
  referenceImageBase64: string | null;
  referenceImageMimeType: string | null;
  // 风格分析结果（含中文摘要 + 检测到的背景元素）
  styleKeywords: string[];
  styleDescription: string;
  styleDescriptionZh: string;
  backgroundHints: string[];  // 提取到的背景相关元素，供用户感知
  // 生图描述（含中文对照）
  refinedPrompt: string;
  refinedPromptZh: string;
  // 生成设置
  aspectRatio: AspectRatio;
  imageResolution: ImageResolution;
  imageCount: ImageCount;
  backgroundMode: BackgroundMode;
  backgroundCustomText: string;  // backgroundMode === "custom" 时的自定义描述
  // 生成结果
  resultImages: ResultImage[];
  pendingCount: number;
  // 通用
  loadingStage: LoadingStage;
  error: string | null;
}

export type AppAction =
  | { type: "SET_LOADING_STAGE"; payload: LoadingStage }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "CLEAR_ERROR" }
  | { type: "SET_REFERENCE_IMAGE"; payload: { previewUrl: string; base64: string; mimeType: string } }
  | { type: "SET_STYLE_RESULT"; payload: { keywords: string[]; description: string; descriptionZh: string; backgroundHints: string[] } }
  | { type: "SET_REFINED_PROMPT"; payload: { prompt: string; promptZh: string } }
  | { type: "SET_ASPECT_RATIO"; payload: AspectRatio }
  | { type: "SET_IMAGE_RESOLUTION"; payload: ImageResolution }
  | { type: "SET_IMAGE_COUNT"; payload: ImageCount }
  | { type: "SET_BACKGROUND_MODE"; payload: BackgroundMode }
  | { type: "SET_BACKGROUND_CUSTOM_TEXT"; payload: string }
  | { type: "START_GENERATE"; payload: number }
  | { type: "ADD_RESULT_IMAGE"; payload: ResultImage }
  | { type: "FINISH_GENERATE" }
  | { type: "RESET" };

// API 响应类型
export interface ExtractStyleResponse {
  keywords: string[];
  description: string;
  descriptionZh: string;
  backgroundHints: string[];
}

export interface RefinePromptResponse {
  refinedPrompt: string;
  refinedPromptZh: string;
}
