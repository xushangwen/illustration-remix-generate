"use client";

import { useReducer, useCallback } from "react";
import imageCompression from "browser-image-compression";
import {
  GenerationFlowState,
  GenerationFlowAction,
  AspectRatio,
  ImageResolution,
  ImageCount,
  ExtractStyleResponse,
  RefinePromptResponse,
  GenerateImagesResponse,
} from "@/lib/types";

const initialState: GenerationFlowState = {
  step: 1,
  referenceImagePreview: null,
  referenceImageBase64: null,
  referenceImageMimeType: null,
  styleKeywords: [],
  styleDescription: "",
  userDescription: "",
  refinedPrompt: "",
  aspectRatio: "16:9",
  imageResolution: "2K",
  imageCount: 1,
  resultImages: [],
  loading: false,
  error: null,
};

function reducer(state: GenerationFlowState, action: GenerationFlowAction): GenerationFlowState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload, error: null };
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };
    case "SET_REFERENCE_IMAGE":
      return {
        ...state,
        referenceImagePreview: action.payload.previewUrl,
        referenceImageBase64: action.payload.base64,
        referenceImageMimeType: action.payload.mimeType,
      };
    case "SET_STYLE_RESULT":
      return {
        ...state,
        styleKeywords: action.payload.keywords,
        styleDescription: action.payload.description,
        loading: false,
        step: 2,
      };
    case "SET_USER_DESCRIPTION":
      return { ...state, userDescription: action.payload };
    case "SET_REFINED_PROMPT":
      return { ...state, refinedPrompt: action.payload, loading: false };
    case "SET_ASPECT_RATIO":
      return { ...state, aspectRatio: action.payload };
    case "SET_IMAGE_RESOLUTION":
      return { ...state, imageResolution: action.payload };
    case "SET_IMAGE_COUNT":
      return { ...state, imageCount: action.payload };
    case "SET_RESULT_IMAGES":
      return {
        ...state,
        resultImages: action.payload,
        loading: false,
        step: 3,
      };
    case "GO_TO_STEP":
      return { ...state, step: action.payload, error: null };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

/**
 * 将 File 对象转为 base64 字符串（客户端，使用 FileReader）
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      resolve(dataUrl.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function useGenerationFlow() {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Step 1: 上传图片并提取风格
  const extractStyle = useCallback(async (imageFile: File, previewUrl: string) => {
    dispatch({ type: "SET_LOADING", payload: true });

    try {
      // 垫图压到 300KB/768px，减少请求体体积
      const styleRefFile = await imageCompression(imageFile, {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 768,
        useWebWorker: true,
      });
      const base64 = await fileToBase64(styleRefFile);

      dispatch({
        type: "SET_REFERENCE_IMAGE",
        payload: { previewUrl, base64, mimeType: styleRefFile.type },
      });

      const formData = new FormData();
      formData.append("image", imageFile);

      const res = await fetch("/api/extract-style", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "风格提取失败");

      dispatch({ type: "SET_STYLE_RESULT", payload: data as ExtractStyleResponse });
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err instanceof Error ? err.message : "风格提取失败" });
    }
  }, []);

  // Step 2: 精化场景描述 → 生成 refinedPrompt
  const refinePrompt = useCallback(
    async (userDescription: string) => {
      dispatch({ type: "SET_USER_DESCRIPTION", payload: userDescription });
      dispatch({ type: "SET_LOADING", payload: true });

      try {
        const res = await fetch("/api/refine-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userDescription, styleKeywords: state.styleKeywords }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Prompt 精化失败");

        dispatch({ type: "SET_REFINED_PROMPT", payload: (data as RefinePromptResponse).refinedPrompt });
      } catch (err) {
        dispatch({ type: "SET_ERROR", payload: err instanceof Error ? err.message : "Prompt 精化失败" });
      }
    },
    [state.styleKeywords]
  );

  // Step 2 扩展: 在已有 refinedPrompt 基础上按用户描述修改
  const editPrompt = useCallback(
    async (editRequest: string) => {
      if (!state.refinedPrompt.trim()) return;
      dispatch({ type: "SET_LOADING", payload: true });

      try {
        const res = await fetch("/api/edit-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentPrompt: state.refinedPrompt,
            editRequest,
            styleKeywords: state.styleKeywords,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "提示词优化失败");

        dispatch({ type: "SET_REFINED_PROMPT", payload: (data as RefinePromptResponse).refinedPrompt });
      } catch (err) {
        dispatch({ type: "SET_ERROR", payload: err instanceof Error ? err.message : "提示词优化失败" });
      }
    },
    [state.refinedPrompt, state.styleKeywords]
  );

  // Step 3: 并行批量生成图片
  const generateImage = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });

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
          referenceImageBase64: state.referenceImageBase64,
          referenceImageMimeType: state.referenceImageMimeType,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "图片生成失败");

      const { images } = data as GenerateImagesResponse;
      dispatch({
        type: "SET_RESULT_IMAGES",
        payload: images.map((img) => ({ base64: img.imageBase64, mimeType: img.mimeType })),
      });
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err instanceof Error ? err.message : "图片生成失败" });
    }
  }, [
    state.refinedPrompt,
    state.styleKeywords,
    state.styleDescription,
    state.aspectRatio,
    state.imageResolution,
    state.imageCount,
    state.referenceImageBase64,
    state.referenceImageMimeType,
  ]);

  const setRefinedPrompt = useCallback((prompt: string) => {
    dispatch({ type: "SET_REFINED_PROMPT", payload: prompt });
  }, []);

  const setAspectRatio = useCallback((ratio: AspectRatio) => {
    dispatch({ type: "SET_ASPECT_RATIO", payload: ratio });
  }, []);

  const setImageResolution = useCallback((resolution: ImageResolution) => {
    dispatch({ type: "SET_IMAGE_RESOLUTION", payload: resolution });
  }, []);

  const setImageCount = useCallback((count: ImageCount) => {
    dispatch({ type: "SET_IMAGE_COUNT", payload: count });
  }, []);

  const goToStep = useCallback((step: 1 | 2 | 3) => {
    dispatch({ type: "GO_TO_STEP", payload: step });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return {
    state,
    extractStyle,
    refinePrompt,
    editPrompt,
    generateImage,
    setRefinedPrompt,
    setAspectRatio,
    setImageResolution,
    setImageCount,
    goToStep,
    reset,
  };
}
