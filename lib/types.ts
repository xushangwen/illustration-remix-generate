// 三步流程的全局共享类型定义

export type AspectRatio = "16:9" | "1:1" | "9:16";
export type ImageResolution = "1K" | "2K" | "4K";
export type ImageCount = 1 | 2 | 4;

export interface StyleAnalysisResult {
  keywords: string[];
  description: string;
}

export interface ResultImage {
  base64: string;
  mimeType: string;
}

export interface GenerationFlowState {
  step: 1 | 2 | 3;
  // Step 1 数据
  referenceImagePreview: string | null;
  referenceImageBase64: string | null;
  referenceImageMimeType: string | null;
  styleKeywords: string[];
  styleDescription: string;
  // Step 2 数据
  userDescription: string;
  refinedPrompt: string;
  aspectRatio: AspectRatio;
  imageResolution: ImageResolution;
  imageCount: ImageCount;
  // Step 3 数据
  resultImages: ResultImage[];
  // 通用状态
  loading: boolean;
  error: string | null;
}

export type GenerationFlowAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_REFERENCE_IMAGE"; payload: { previewUrl: string; base64: string; mimeType: string } }
  | { type: "SET_STYLE_RESULT"; payload: StyleAnalysisResult }
  | { type: "SET_USER_DESCRIPTION"; payload: string }
  | { type: "SET_REFINED_PROMPT"; payload: string }
  | { type: "SET_ASPECT_RATIO"; payload: AspectRatio }
  | { type: "SET_IMAGE_RESOLUTION"; payload: ImageResolution }
  | { type: "SET_IMAGE_COUNT"; payload: ImageCount }
  | { type: "SET_RESULT_IMAGES"; payload: ResultImage[] }
  | { type: "GO_TO_STEP"; payload: 1 | 2 | 3 }
  | { type: "RESET" };

// API 响应类型
export interface ExtractStyleResponse {
  keywords: string[];
  description: string;
}

export interface RefinePromptResponse {
  refinedPrompt: string;
}

export interface GenerateImagesResponse {
  images: Array<{ imageBase64: string; mimeType: string }>;
}
