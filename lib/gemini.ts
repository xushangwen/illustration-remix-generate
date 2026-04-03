// SERVER ONLY — 禁止在客户端组件中 import 此文件
// 此文件包含 Gemini API 密钥，仅在服务端 API Route 中使用

import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("缺少环境变量 GEMINI_API_KEY，请在 .env.local 中配置");
}

export const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// 集中管理模型名，方便切换
export const VISION_MODEL = "gemini-3.1-flash-lite-preview";
export const IMAGE_GEN_MODEL = "gemini-3.1-flash-image-preview";
