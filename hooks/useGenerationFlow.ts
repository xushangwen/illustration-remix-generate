"use client";

import { useReducer, useCallback, useEffect, useRef } from "react";
import imageCompression from "browser-image-compression";
import {
  AppState, AppAction,
  AspectRatio, ImageResolution, ImageCount, BackgroundMode,
  ExtractStyleResponse, RefinePromptResponse,
} from "@/lib/types";

export const initialGenerationFlowState: AppState = {
  referenceImagePreview: null,
  referenceImageBase64: null,
  referenceImageMimeType: null,
  styleKeywords: [],
  styleDescription: "",
  styleDescriptionZh: "",
  backgroundHints: [],
  refinedPrompt: "",
  refinedPromptZh: "",
  finalPromptOverride: "",
  aspectRatio: "1:1",
  imageResolution: "2K",
  imageCount: 1,
  backgroundMode: "reference",
  backgroundCustomText: "",
  resultImages: [],
  pendingCount: 0,
  generationFailures: 0,
  loadingStage: null,
  error: null,
};

export function generationFlowReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_LOADING_STAGE":
      return { ...state, loadingStage: action.payload, error: null };
    case "SET_ERROR":
      return { ...state, error: action.payload, loadingStage: null };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    case "START_REFERENCE_UPLOAD":
      return {
        ...state,
        referenceImagePreview: action.payload.previewUrl,
        referenceImageBase64: null,
        referenceImageMimeType: null,
        styleKeywords: [],
        styleDescription: "",
        styleDescriptionZh: "",
        backgroundHints: [],
        refinedPrompt: "",
        refinedPromptZh: "",
        finalPromptOverride: "",
        backgroundCustomText: "",
        resultImages: [],
        pendingCount: 0,
        generationFailures: 0,
        loadingStage: "extract",
        error: null,
      };
    case "SET_REFERENCE_IMAGE_DATA":
      return {
        ...state,
        referenceImageBase64: action.payload.base64,
        referenceImageMimeType: action.payload.mimeType,
      };
    case "SET_STYLE_RESULT":
      return {
        ...state,
        styleKeywords: action.payload.keywords,
        styleDescription: action.payload.description,
        styleDescriptionZh: action.payload.descriptionZh,
        backgroundHints: action.payload.backgroundHints,
        loadingStage: null,
      };
    case "SET_BACKGROUND_MODE":
      return { ...state, backgroundMode: action.payload };
    case "SET_BACKGROUND_CUSTOM_TEXT":
      return { ...state, backgroundCustomText: action.payload };
    case "SET_REFINED_PROMPT":
      return {
        ...state,
        refinedPrompt: action.payload.prompt,
        refinedPromptZh: action.payload.promptZh,
        // 场景描述更新后，清除之前的手动覆盖，重新让用户确认
        finalPromptOverride: "",
        loadingStage: null,
      };
    case "SET_FINAL_PROMPT_OVERRIDE":
      return { ...state, finalPromptOverride: action.payload };
    case "SET_ASPECT_RATIO":
      return { ...state, aspectRatio: action.payload };
    case "SET_IMAGE_RESOLUTION":
      return { ...state, imageResolution: action.payload };
    case "SET_IMAGE_COUNT":
      return { ...state, imageCount: action.payload };
    case "START_GENERATE":
      return {
        ...state,
        resultImages: [],
        pendingCount: action.payload,
        generationFailures: 0,
        loadingStage: "generate",
        error: null,
      };
    case "ADD_RESULT_IMAGE":
      const existingImageIndex = state.resultImages.findIndex((image) => image.index === action.payload.index);
      const nextImages =
        existingImageIndex === -1
          ? [...state.resultImages, action.payload]
          : state.resultImages.map((image, index) => (index === existingImageIndex ? action.payload : image));

      return {
        ...state,
        resultImages: nextImages.sort((left, right) => left.index - right.index),
        // 每个 index 只计入一次，避免重复 SSE 导致进度错乱
        pendingCount: existingImageIndex === -1 ? Math.max(0, state.pendingCount - 1) : state.pendingCount,
      };
    case "ADD_GENERATION_FAILURE":
      return {
        ...state,
        generationFailures: state.generationFailures + 1,
        pendingCount: Math.max(0, state.pendingCount - 1),
      };
    case "FINISH_GENERATE":
      return {
        ...state,
        loadingStage: null,
        pendingCount: 0,
        // 如果全程没有成功图片，报错
        error:
          state.resultImages.length === 0
            ? state.error ?? (state.generationFailures > 0 ? "图片生成失败，请重试" : null)
            : state.error,
      };
    case "RESET":
      return initialGenerationFlowState;
    default:
      return state;
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function useGenerationFlow() {
  const [state, dispatch] = useReducer(generationFlowReducer, initialGenerationFlowState);
  const extractRequestIdRef = useRef(0);
  const promptRequestIdRef = useRef(0);
  const generationRequestIdRef = useRef(0);
  const extractAbortRef = useRef<AbortController | null>(null);
  const promptAbortRef = useRef<AbortController | null>(null);
  const generationAbortRef = useRef<AbortController | null>(null);

  const abortExtract = useCallback(() => {
    extractAbortRef.current?.abort();
    extractAbortRef.current = null;
    extractRequestIdRef.current += 1;
    return extractRequestIdRef.current;
  }, []);

  const abortPrompt = useCallback(() => {
    promptAbortRef.current?.abort();
    promptAbortRef.current = null;
    promptRequestIdRef.current += 1;
    return promptRequestIdRef.current;
  }, []);

  const abortGeneration = useCallback(() => {
    generationAbortRef.current?.abort();
    generationAbortRef.current = null;
    generationRequestIdRef.current += 1;
    return generationRequestIdRef.current;
  }, []);

  useEffect(() => {
    return () => {
      abortExtract();
      abortPrompt();
      abortGeneration();
    };
  }, [abortExtract, abortPrompt, abortGeneration]);

  // 上传参考图 + 提取风格
  const extractStyle = useCallback(async (imageFile: File, previewUrl: string) => {
    const requestId = abortExtract();
    abortPrompt();
    abortGeneration();
    const controller = new AbortController();
    extractAbortRef.current = controller;

    dispatch({ type: "START_REFERENCE_UPLOAD", payload: { previewUrl } });

    try {
      // 垫图压缩：风格参考不需要高分辨率
      const refFile = await imageCompression(imageFile, {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 768,
        useWebWorker: true,
      });
      if (requestId !== extractRequestIdRef.current) return;

      const base64 = await fileToBase64(refFile);
      if (requestId !== extractRequestIdRef.current) return;

      dispatch({
        type: "SET_REFERENCE_IMAGE_DATA",
        payload: { base64, mimeType: refFile.type },
      });

      const formData = new FormData();
      formData.append("image", imageFile);

      const res = await fetch("/api/extract-style", { method: "POST", body: formData, signal: controller.signal });
      const data = await res.json();
      if (requestId !== extractRequestIdRef.current) return;
      if (!res.ok) throw new Error(data.error ?? "风格提取失败");

      const styleData = data as ExtractStyleResponse;
      dispatch({
        type: "SET_STYLE_RESULT",
        payload: {
          keywords: styleData.keywords,
          description: styleData.description,
          descriptionZh: styleData.descriptionZh ?? "",
          backgroundHints: styleData.backgroundHints ?? [],
        },
      });
    } catch (err) {
      if (requestId !== extractRequestIdRef.current || isAbortError(err)) return;
      dispatch({ type: "SET_ERROR", payload: err instanceof Error ? err.message : "风格提取失败" });
    } finally {
      if (requestId === extractRequestIdRef.current && extractAbortRef.current === controller) {
        extractAbortRef.current = null;
      }
    }
  }, [abortExtract, abortGeneration, abortPrompt]);

  // 将场景描述精化为英文生图 Prompt
  const refinePrompt = useCallback(
    async (userDescription: string) => {
      const requestId = abortPrompt();
      const controller = new AbortController();
      promptAbortRef.current = controller;
      dispatch({ type: "SET_LOADING_STAGE", payload: "refine" });
      try {
        const res = await fetch("/api/refine-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userDescription, styleKeywords: state.styleKeywords }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (requestId !== promptRequestIdRef.current) return;
        if (!res.ok) throw new Error(data.error ?? "Prompt 精化失败");
        const refineData = data as RefinePromptResponse;
        dispatch({
          type: "SET_REFINED_PROMPT",
          payload: { prompt: refineData.refinedPrompt, promptZh: refineData.refinedPromptZh ?? "" },
        });
      } catch (err) {
        if (requestId !== promptRequestIdRef.current || isAbortError(err)) return;
        dispatch({ type: "SET_ERROR", payload: err instanceof Error ? err.message : "Prompt 精化失败" });
      } finally {
        if (requestId === promptRequestIdRef.current && promptAbortRef.current === controller) {
          promptAbortRef.current = null;
        }
      }
    },
    [abortPrompt, state.styleKeywords]
  );

  // 在已有 Prompt 基础上按用户描述修改
  const editPrompt = useCallback(
    async (editRequest: string) => {
      if (!state.refinedPrompt.trim()) return;
      const requestId = abortPrompt();
      const controller = new AbortController();
      promptAbortRef.current = controller;
      dispatch({ type: "SET_LOADING_STAGE", payload: "edit" });
      try {
        const res = await fetch("/api/edit-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentPrompt: state.refinedPrompt,
            editRequest,
            styleKeywords: state.styleKeywords,
          }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (requestId !== promptRequestIdRef.current) return;
        if (!res.ok) throw new Error(data.error ?? "提示词优化失败");
        const editData = data as RefinePromptResponse;
        dispatch({
          type: "SET_REFINED_PROMPT",
          payload: { prompt: editData.refinedPrompt, promptZh: editData.refinedPromptZh ?? "" },
        });
      } catch (err) {
        if (requestId !== promptRequestIdRef.current || isAbortError(err)) return;
        dispatch({ type: "SET_ERROR", payload: err instanceof Error ? err.message : "提示词优化失败" });
      } finally {
        if (requestId === promptRequestIdRef.current && promptAbortRef.current === controller) {
          promptAbortRef.current = null;
        }
      }
    },
    [abortPrompt, state.refinedPrompt, state.styleKeywords]
  );

  // 并行批量生成图片，SSE 流式接收，逐张渲染
  const generateImage = useCallback(async () => {
    if (!state.referenceImageBase64 || !state.referenceImageMimeType) {
      dispatch({ type: "SET_ERROR", payload: "缺少参考图数据，请重新上传参考图" });
      return;
    }

    const requestId = abortGeneration();
    const controller = new AbortController();
    generationAbortRef.current = controller;
    dispatch({ type: "START_GENERATE", payload: state.imageCount });

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refinedPrompt: state.refinedPrompt,
          styleKeywords: state.styleKeywords,
          styleDescription: state.styleDescription,
          aspectRatio: state.aspectRatio,
          imageResolution: state.imageResolution,
          imageCount: state.imageCount,
          backgroundMode: state.backgroundMode,
          backgroundCustomText: state.backgroundCustomText,
          backgroundHints: state.backgroundHints,
          referenceImageBase64: state.referenceImageBase64,
          referenceImageMimeType: state.referenceImageMimeType,
          // 若用户在预览卡片中手动修改了最终指令，优先使用覆盖值
          finalPromptOverride: state.finalPromptOverride || undefined,
        }),
        signal: controller.signal,
      });

      // 如果不是流（比如参数验证失败返回 JSON 错误），走普通错误处理
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "图片生成失败");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        // SSE 每条消息以 \n\n 结尾
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;
          const dataStr = line.slice(6).trim();
          if (dataStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(dataStr) as {
              index?: number;
              imageBase64?: string;
              mimeType?: string;
              error?: string;
            };
            if (requestId !== generationRequestIdRef.current) return;
            if (typeof parsed.index === "number" && parsed.imageBase64 && parsed.mimeType) {
              dispatch({
                type: "ADD_RESULT_IMAGE",
                payload: { index: parsed.index, base64: parsed.imageBase64, mimeType: parsed.mimeType },
              });
            } else if (parsed.error) {
              dispatch({ type: "ADD_GENERATION_FAILURE" });
            }
          } catch {
            // 解析单条 SSE 消息失败，跳过
          }
        }
      }
    } catch (err) {
      if (requestId !== generationRequestIdRef.current || isAbortError(err)) return;
      dispatch({ type: "SET_ERROR", payload: err instanceof Error ? err.message : "图片生成失败" });
    } finally {
      if (requestId === generationRequestIdRef.current) {
        dispatch({ type: "FINISH_GENERATE" });
        if (generationAbortRef.current === controller) {
          generationAbortRef.current = null;
        }
      }
    }
  }, [
    abortGeneration,
    state.refinedPrompt,
    state.styleKeywords,
    state.styleDescription,
    state.aspectRatio,
    state.imageResolution,
    state.imageCount,
    state.backgroundMode,
    state.backgroundCustomText,
    state.backgroundHints,
    state.referenceImageBase64,
    state.referenceImageMimeType,
    state.finalPromptOverride,
  ]);

  // 用户在最终指令预览卡片中直接修改完整融合 prompt
  const setFinalPromptOverride = useCallback(
    (p: string) => dispatch({ type: "SET_FINAL_PROMPT_OVERRIDE", payload: p }),
    []
  );

  // 用户手动编辑 prompt 时保留原有中文对照（中文不变）
  const setRefinedPrompt = useCallback(
    (p: string) =>
      dispatch({ type: "SET_REFINED_PROMPT", payload: { prompt: p, promptZh: state.refinedPromptZh } }),
    [state.refinedPromptZh]
  );
  const setAspectRatio = useCallback((r: AspectRatio) => dispatch({ type: "SET_ASPECT_RATIO", payload: r }), []);
  const setImageResolution = useCallback((r: ImageResolution) => dispatch({ type: "SET_IMAGE_RESOLUTION", payload: r }), []);
  const setImageCount = useCallback((c: ImageCount) => dispatch({ type: "SET_IMAGE_COUNT", payload: c }), []);
  const setBackgroundMode = useCallback((m: BackgroundMode) => dispatch({ type: "SET_BACKGROUND_MODE", payload: m }), []);
  const setBackgroundCustomText = useCallback((t: string) => dispatch({ type: "SET_BACKGROUND_CUSTOM_TEXT", payload: t }), []);
  const clearError = useCallback(() => dispatch({ type: "CLEAR_ERROR" }), []);
  const reset = useCallback(() => {
    abortExtract();
    abortPrompt();
    abortGeneration();
    dispatch({ type: "RESET" });
  }, [abortExtract, abortGeneration, abortPrompt]);

  return {
    state,
    extractStyle,
    refinePrompt,
    editPrompt,
    generateImage,
    setRefinedPrompt,
    setFinalPromptOverride,
    setAspectRatio,
    setImageResolution,
    setImageCount,
    setBackgroundMode,
    setBackgroundCustomText,
    clearError,
    reset,
  };
}
