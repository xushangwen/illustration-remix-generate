export type AspectRatio = "16:9" | "1:1" | "9:16";
export type ImageResolution = "1K" | "2K" | "4K";
export type ImageCount = 1 | 2 | 4;
// 各阶段独立 loading 标识，用于精准控制每个 section 的 loading UI
export type LoadingStage = "extract" | "refine" | "edit" | "generate" | null;

export interface ResultImage {
  base64: string;
  mimeType: string;
}

export interface AppState {
  // 参考图
  referenceImagePreview: string | null;
  referenceImageBase64: string | null;
  referenceImageMimeType: string | null;
  // 风格分析结果
  styleKeywords: string[];
  styleDescription: string;
  // 生图描述
  refinedPrompt: string;
  // 生成设置
  aspectRatio: AspectRatio;
  imageResolution: ImageResolution;
  imageCount: ImageCount;
  // 生成结果
  resultImages: ResultImage[];
  pendingCount: number; // 还在生成中的图片数，驱动骨架屏
  // 通用
  loadingStage: LoadingStage;
  error: string | null;
}

export type AppAction =
  | { type: "SET_LOADING_STAGE"; payload: LoadingStage }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "CLEAR_ERROR" }
  | { type: "SET_REFERENCE_IMAGE"; payload: { previewUrl: string; base64: string; mimeType: string } }
  | { type: "SET_STYLE_RESULT"; payload: { keywords: string[]; description: string } }
  | { type: "SET_REFINED_PROMPT"; payload: string }
  | { type: "SET_ASPECT_RATIO"; payload: AspectRatio }
  | { type: "SET_IMAGE_RESOLUTION"; payload: ImageResolution }
  | { type: "SET_IMAGE_COUNT"; payload: ImageCount }
  | { type: "START_GENERATE"; payload: number } // payload = 请求张数
  | { type: "ADD_RESULT_IMAGE"; payload: ResultImage } // SSE 逐张追加
  | { type: "FINISH_GENERATE" }
  | { type: "RESET" };

// API 响应类型
export interface ExtractStyleResponse {
  keywords: string[];
  description: string;
}

export interface RefinePromptResponse {
  refinedPrompt: string;
}
