// SERVER ONLY — 禁止在客户端组件中 import 此文件

import { GoogleGenAI } from "@google/genai";

// 懒加载：构建时不初始化，仅在运行时请求到来时才检查 key
// 避免 Vercel 构建阶段因 env var 缺失而报错
let _genai: GoogleGenAI | null = null;

export function getGenAI(): GoogleGenAI {
  if (!_genai) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("缺少环境变量 GEMINI_API_KEY，请在 Vercel 项目设置中配置");
    }
    _genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return _genai;
}

// 图片分析/提示词精化：最新 Pro 预览版，理解力更强
export const VISION_MODEL = "gemini-3.1-pro-preview";
export const IMAGE_GEN_MODEL = "gemini-3.1-flash-image-preview";
