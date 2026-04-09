// 图片处理工具函数

export const SUPPORTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * 检查文件类型是否受 Gemini API 支持
 */
export function isSupportedImageType(mimeType: string): mimeType is SupportedMimeType {
  return (SUPPORTED_MIME_TYPES as readonly string[]).includes(mimeType);
}

/**
 * 将 LLM 输出的文本安全解析为 JSON
 * 处理 LLM 偶尔在 JSON 前后附加 markdown 代码块的情况
 */
export function safeParseJSON<T>(text: string): T {
  const cleaned = extractJsonCandidate(text);

  return JSON.parse(cleaned) as T;
}

function extractJsonCandidate(text: string): string {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");
  if (objectStart !== -1 && objectEnd > objectStart) {
    return trimmed.slice(objectStart, objectEnd + 1).trim();
  }

  const arrayStart = trimmed.indexOf("[");
  const arrayEnd = trimmed.lastIndexOf("]");
  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    return trimmed.slice(arrayStart, arrayEnd + 1).trim();
  }

  return trimmed;
}

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/**
 * 生成带时间戳的下载文件名
 * mimeType 决定扩展名，确保文件内容与扩展名一致（macOS 缩略图依赖此对应关系）
 */
export function generateFileName(prefix: string = "illustration", mimeType: string = "image/png"): string {
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);
  const ext = MIME_TO_EXT[mimeType] ?? "png";
  return `${prefix}_${timestamp}.${ext}`;
}

/**
 * 将 base64 字符串触发浏览器下载
 * （仅客户端使用）
 */
export function downloadBase64Image(base64: string, mimeType: string, fileName: string): void {
  const link = document.createElement("a");
  link.href = `data:${mimeType};base64,${base64}`;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
