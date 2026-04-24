"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import imageCompression from "browser-image-compression";
import { Icon, type IconName } from "@/components/ui/Icon";
import { KeywordBadge } from "@/components/ui/KeywordBadge";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import {
  isSupportedImageType,
  downloadBase64Image,
  generateFileName,
  MAX_UPLOAD_BYTES,
} from "@/lib/image-utils";
import { useGenerationFlow } from "@/hooks/useGenerationFlow";
import { buildFinalImagePromptWithReference } from "@/lib/prompts";
import type {
  AspectRatio,
  ImageResolution,
  ImageCount,
  BackgroundMode,
} from "@/lib/types";

const ASPECT_RATIOS: { value: AspectRatio; label: string; desc: string }[] = [
  { value: "16:9", label: "16:9", desc: "横版" },
  { value: "4:3", label: "4:3", desc: "横版" },
  { value: "1:1", label: "1:1", desc: "方形" },
  { value: "3:4", label: "3:4", desc: "竖版" },
  { value: "9:16", label: "9:16", desc: "竖版" },
];

const RESOLUTIONS: { value: ImageResolution; label: string; sub: string }[] = [
  { value: "1K", label: "1K", sub: "快速" },
  { value: "2K", label: "2K", sub: "标准" },
  { value: "4K", label: "4K", sub: "高清" },
];

const IMAGE_COUNTS: { value: ImageCount; label: string }[] = [
  { value: 1, label: "× 1" },
  { value: 2, label: "× 2" },
  { value: 4, label: "× 4" },
];

const BACKGROUND_MODES: {
  value: BackgroundMode;
  label: string;
  desc: string;
  icon: IconName;
}[] = [
  { value: "reference", label: "参照原图", desc: "保留参考图背景风格", icon: "image" },
  { value: "clean", label: "干净背景", desc: "白色或浅色的简洁背景", icon: "contrast" },
  { value: "isolated", label: "无背景", desc: "只保留主体，更适合图标或贴纸", icon: "subtract" },
  { value: "custom", label: "自定义", desc: "自己描述想要的背景", icon: "edit" },
];

const PAGE_SHELL =
  "relative grid min-h-dvh grid-rows-[auto_1fr_auto] overflow-x-clip bg-[linear-gradient(180deg,_#f4f4f2_0%,_#ececea_100%)] text-neutral-900";

const CARD_SHELL =
  "overflow-hidden rounded-[24px] border border-[rgba(43,43,43,0.06)] bg-[rgba(255,255,255,0.88)] shadow-[0_1px_0_rgba(255,255,255,0.95)_inset,0_18px_38px_-30px_rgba(93,72,35,0.18)] backdrop-blur-sm";

const CARD_SECTION = "border-t border-[rgba(43,43,43,0.06)]";

const CARD_HEADING =
  "text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-400";

const CARD_TITLE =
  "mt-1.5 text-[16px] font-semibold tracking-[-0.03em] text-neutral-800 sm:text-[17px]";

const INPUT_CLASS =
  "w-full rounded-[15px] border border-[rgba(43,43,43,0.08)] bg-white/84 px-4 py-2.5 text-[11px] text-neutral-700 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset] transition-all outline-none placeholder:text-neutral-400 focus:border-neutral-900/30 focus:ring-4 focus:ring-black/5 disabled:opacity-60";

const TILE_BASE =
  "rounded-[14px] border text-[10px] leading-none font-medium transition-all";

export default function Home() {
  const {
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
  } = useGenerationFlow();

  const [description, setDescription] = useState("");
  const [editRequest, setEditRequest] = useState("");
  const [styleCopyState, setStyleCopyState] = useState<"idle" | "success" | "error">("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);

  const resultsRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  const isExtracting = state.loadingStage === "extract";
  const isRefining = state.loadingStage === "refine" || state.loadingStage === "edit";
  const isGenerating = state.loadingStage === "generate";
  const hasStyle = state.styleKeywords.length > 0;
  const hasPrompt = !!state.refinedPrompt;
  const hasResults = state.resultImages.length > 0;
  const canGenerate = hasPrompt && !isGenerating && !isRefining;
  const step1Error = uploadError ?? (state.loadingStage === null && !hasStyle ? state.error : null);

  const computedFinalPrompt = hasPrompt
    ? buildFinalImagePromptWithReference(
        state.refinedPrompt,
        state.styleKeywords,
        state.styleDescription,
        state.backgroundMode,
        state.backgroundCustomText,
        state.backgroundHints,
      )
    : "";
  const displayFinalPrompt = state.finalPromptOverride || computedFinalPrompt;
  const isFinalPromptModified =
    !!state.finalPromptOverride && state.finalPromptOverride !== computedFinalPrompt;

  const stylePromptText = hasStyle
    ? [state.styleDescription, state.styleKeywords.join(", ")].filter(Boolean).join(". ")
    : "";

  useEffect(() => {
    if (hasStyle && !hasPrompt) {
      setTimeout(() => descRef.current?.focus(), 200);
    }
  }, [hasStyle, hasPrompt]);

  useEffect(() => {
    if (isGenerating) {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [isGenerating]);

  useEffect(() => {
    if (!hasStyle) {
      setDescription("");
      setEditRequest("");
    }
  }, [hasStyle]);

  useEffect(() => {
    if (!state.referenceImagePreview && previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
      setUploadError(null);
    }
  }, [state.referenceImagePreview]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setUploadError(null);
      clearError();

      if (!isSupportedImageType(file.type)) {
        setUploadError("不支持的图片格式，请上传 JPG、PNG 或 WebP");
        return;
      }

      if (file.size > MAX_UPLOAD_BYTES) {
        setUploadError("图片不能超过 10MB，请压缩后再试");
        return;
      }

      let processedFile = file;
      if (file.size > 2 * 1024 * 1024) {
        try {
          processedFile = await imageCompression(file, {
            maxSizeMB: 2,
            maxWidthOrHeight: 2048,
            useWebWorker: true,
          });
        } catch {
          setUploadError("图片压缩失败，请尝试更小的文件");
          return;
        }
      }

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }

      const previewUrl = URL.createObjectURL(processedFile);
      previewUrlRef.current = previewUrl;
      extractStyle(processedFile, previewUrl);
    },
    [clearError, extractStyle],
  );

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (isExtracting) {
        return;
      }

      for (const item of Array.from(event.clipboardData?.items ?? [])) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            handleFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [isExtracting, handleFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files[0] && handleFile(files[0]),
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    multiple: false,
    disabled: isExtracting,
  });

  const handleRefine = () => {
    if (description.trim()) {
      refinePrompt(description.trim());
    }
  };

  const handleEdit = () => {
    if (editRequest.trim()) {
      editPrompt(editRequest.trim());
      setEditRequest("");
    }
  };

  const handleDownload = (base64: string, mimeType: string, index: number) => {
    downloadBase64Image(base64, mimeType, generateFileName(`illustration_${index + 1}`, mimeType));
  };

  const handleDownloadAll = () => {
    state.resultImages.forEach((image) => handleDownload(image.base64, image.mimeType, image.index));
  };

  const handleCopyStyle = () => {
    navigator.clipboard
      .writeText(stylePromptText)
      .then(() => {
        setStyleCopyState("success");
        setTimeout(() => setStyleCopyState("idle"), 2000);
      })
      .catch(() => {
        setStyleCopyState("error");
        setTimeout(() => setStyleCopyState("idle"), 2500);
      });
  };

  return (
    <div className={PAGE_SHELL}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.8),_transparent_60%),radial-gradient(circle_at_18%_20%,_rgba(85,127,210,0.08),_transparent_22%)]"
      />

      <header className="sticky top-0 z-10 border-b border-white/70 bg-white/76 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[760px] flex-wrap items-center justify-between gap-2 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[12px] border border-[rgba(43,43,43,0.08)] bg-neutral-900 shadow-[0_10px_20px_-16px_rgba(23,23,23,0.68)]">
              <Icon name="brush-ai" className="h-4 w-4 text-base text-white" />
            </div>
            <span className="text-sm font-semibold tracking-[0.01em] text-neutral-800">插画风格生成器</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-neutral-400">由 Gemini 驱动</span>
            {(hasStyle || hasResults) && (
              <button
                onClick={reset}
                className="rounded-full border border-[rgba(43,43,43,0.08)] bg-[#efefec] px-3.5 py-1.5 text-[11px] font-medium text-neutral-600 transition-colors hover:border-neutral-900/14 hover:bg-[#e8e8e5] hover:text-neutral-800"
              >
                重置
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative mx-auto flex w-full max-w-[760px] flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">

        <div className={CARD_SHELL}>
          <div className="px-5 pt-5 pb-4 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={CARD_HEADING}>01 · 参考风格</p>
                <h2 className={CARD_TITLE}>
                  上传参考图
                </h2>
                <p className="mt-1 text-[11px] leading-5 text-neutral-500">
                  从参考插画里提取风格特征、关键词和背景线索。
                </p>
              </div>

              <div className="hidden rounded-[16px] border border-[rgba(43,43,43,0.06)] bg-white/78 px-3.5 py-2.5 sm:block">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-neutral-400">
                  状态
                </p>
                <p className="mt-1 text-right text-[12px] font-medium text-neutral-700">
                  {isExtracting ? "分析中" : hasStyle ? "已提取" : "等待上传"}
                </p>
              </div>
            </div>
          </div>

          <div className={`${CARD_SECTION} p-5 sm:p-6`}>
            <div className="flex flex-col gap-5 sm:flex-row">
              {!state.referenceImagePreview ? (
                <div
                  {...getRootProps({
                    role: "button",
                    tabIndex: 0,
                    "aria-label": "上传参考插画，可拖拽、点击或粘贴",
                    "aria-busy": isExtracting,
                  })}
                  className={`flex w-full cursor-pointer flex-col items-center gap-3 rounded-[20px] border border-dashed p-8 text-center transition-all duration-200 sm:p-10 ${
                    isDragActive
                      ? "border-[#4b88f2] bg-[#edf4ff]"
                      : "border-[rgba(43,43,43,0.12)] bg-[#fcfcfb] hover:border-[rgba(75,136,242,0.5)] hover:bg-white"
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#f2f4f7]">
                    <Icon name="image-add" className="h-5 w-5 text-neutral-500" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-neutral-700">
                      {isDragActive ? "松开上传" : "拖拽 / 点击 / ⌘V 粘贴参考插画"}
                    </p>
                    <p className="mt-1 text-[11px] text-neutral-400">JPG · PNG · WebP，最大 10MB</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-full shrink-0 sm:w-[152px]">
                    <div className="group relative aspect-square w-full overflow-hidden rounded-[18px] border border-[rgba(43,43,43,0.08)] bg-[#f4f4f2] sm:h-[152px] sm:w-[152px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={state.referenceImagePreview}
                        alt="参考图"
                        className="h-full w-full object-cover"
                      />
                      <div
                        {...getRootProps({
                          role: "button",
                          tabIndex: 0,
                          "aria-label": "重新上传参考插画",
                        })}
                        className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-1 bg-black/36 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <input {...getInputProps()} />
                        <Icon name="refresh" className="h-4 w-4 text-white" />
                        <span className="text-xs text-white">换图</span>
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    {isExtracting ? (
                      <div className="flex h-full min-h-[152px] flex-col justify-center rounded-[18px] border border-[rgba(43,43,43,0.06)] bg-[#fcfcfb] px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-4 w-4 shrink-0 rounded-full border-2 border-neutral-300 border-t-[#4b88f2] animate-spin" />
                          <span className="text-[11px] text-neutral-500">正在分析风格特征...</span>
                        </div>
                      </div>
                    ) : hasStyle ? (
                      <div className="flex flex-col gap-4">
                        <div>
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-neutral-400">
                            风格特征
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {state.styleKeywords.map((kw) => (
                              <KeywordBadge key={kw} keyword={kw} />
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-neutral-400">
                              风格提示词
                            </p>
                            <button
                              onClick={handleCopyStyle}
                              className="flex items-center gap-1 text-xs text-neutral-400 transition-colors hover:text-neutral-600"
                            >
                              <Icon
                                name={styleCopyState === "success" ? "check" : "copy"}
                                className={styleCopyState === "success" ? "h-3.5 w-3.5 text-[#4b88f2]" : "h-3.5 w-3.5"}
                              />
                              {styleCopyState === "success" ? "已复制" : styleCopyState === "error" ? "复制失败" : "复制"}
                            </button>
                          </div>
                          <p className="select-all rounded-[14px] border border-[rgba(43,43,43,0.08)] bg-[#fafaf9] px-3 py-2.5 text-xs leading-relaxed text-neutral-500">
                            {stylePromptText}
                          </p>
                          {styleCopyState === "error" && (
                            <p className="mt-1.5 text-xs text-[#bf675e]">
                              浏览器未允许剪贴板写入，请手动复制。
                            </p>
                          )}
                          {state.styleDescriptionZh && (
                            <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                              <span className="mr-1 text-neutral-300">中文</span>
                              {state.styleDescriptionZh}
                            </p>
                          )}
                        </div>

                        {state.backgroundHints.length > 0 && (
                          <div className="flex gap-2 rounded-[14px] border border-[rgba(217,175,93,0.25)] bg-[rgba(244,238,220,0.72)] px-3 py-2.5">
                            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-[#a88234]" />
                            <div>
                              <p className="text-xs font-medium text-[#8b6c2d]">检测到背景元素</p>
                              <p className="mt-0.5 text-xs text-[#9b7d3e]">
                                {state.backgroundHints.join("、")}
                              </p>
                              <p className="mt-1 text-xs text-[#ab8a44]">
                                若不想保留这些背景，在「生成设置」里切换背景模式。
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>

          {step1Error && (
            <div className={`${CARD_SECTION} px-5 py-5 sm:px-6`}>
              <ErrorAlert
                message={step1Error}
                onDismiss={() => {
                  setUploadError(null);
                  clearError();
                }}
              />
            </div>
          )}
        </div>

        {hasStyle && (
          <div className={CARD_SHELL}>
            <div className="px-5 pt-5 pb-4 sm:px-6">
              <p className={CARD_HEADING}>02 · 描述新主题</p>
              <h2 className={CARD_TITLE}>
                输入画面内容
              </h2>
                <p className="mt-1 text-[11px] leading-5 text-neutral-500">
                  这里描述要画什么，风格会自动沿用参考图。
                </p>
            </div>

            <div className={`${CARD_SECTION} p-5 sm:p-6`}>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <textarea
                    ref={descRef}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                        handleRefine();
                      }
                    }}
                    placeholder="保持上面的风格，画一个啤酒杯…&#10;或：一只猫坐在城市屋顶上，俯瞰夜景…"
                    rows={3}
                    disabled={isRefining}
                    className={`${INPUT_CLASS} resize-none leading-relaxed`}
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleRefine}
                      disabled={isRefining || !description.trim()}
                      className="flex items-center gap-2 rounded-full bg-neutral-900 px-3.5 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
                    >
                      {isRefining && state.loadingStage === "refine" ? (
                        <>
                          <div className="h-3.5 w-3.5 rounded-full border-2 border-white/35 border-t-white animate-spin" />
                          AI 分析中...
                        </>
                      ) : (
                        <>
                          <Icon name="magic" className="h-4 w-4" />
                          优化措辞
                          <span className="text-xs text-white/60">⌘↵</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {hasPrompt && (
                  <>
                    <div className="flex flex-col gap-2 border-t border-[rgba(43,43,43,0.06)] pt-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-neutral-400">
                        场景描述（英文，可直接编辑）
                      </p>
                      <textarea
                        value={state.refinedPrompt}
                        onChange={(event) => setRefinedPrompt(event.target.value)}
                        rows={4}
                        disabled={isRefining}
                        className={`${INPUT_CLASS} resize-none leading-relaxed`}
                      />
                      {state.refinedPromptZh && (
                        <div className="flex gap-2 rounded-[14px] border border-[rgba(43,43,43,0.06)] bg-[#fafaf9] px-3 py-2.5">
                          <span className="mt-0.5 shrink-0 text-xs text-neutral-300">中文</span>
                          <p className="text-xs leading-relaxed text-neutral-500">{state.refinedPromptZh}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={editRequest}
                        onChange={(event) => setEditRequest(event.target.value)}
                        onKeyDown={(event) => event.key === "Enter" && !isRefining && handleEdit()}
                        placeholder="修改描述：把主角换成机器人、去掉背景里的树..."
                        disabled={isRefining}
                        className={`${INPUT_CLASS} flex-1 py-2.5`}
                      />
                      <button
                        onClick={handleEdit}
                        disabled={isRefining || !editRequest.trim()}
                        className="flex shrink-0 items-center justify-center gap-1.5 rounded-[15px] border border-[rgba(43,43,43,0.08)] bg-[#f1f1ef] px-3.5 py-2 text-[11px] font-medium text-neutral-700 transition-colors hover:border-neutral-900/20 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isRefining && state.loadingStage === "edit" ? (
                          <div className="h-3.5 w-3.5 rounded-full border-2 border-neutral-300 border-t-[#4b88f2] animate-spin" />
                        ) : (
                          <Icon name="edit-ai" className="h-4 w-4" />
                        )}
                        AI 修改
                      </button>
                    </div>
                  </>
                )}

                {state.error && state.loadingStage === null && hasStyle && (
                  <ErrorAlert message={state.error} onDismiss={clearError} />
                )}
              </div>
            </div>
          </div>
        )}

        {hasPrompt && (
          <div className={CARD_SHELL}>
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5 pb-4 sm:px-6">
              <div>
                <p className={CARD_HEADING}>03 · 最终生图指令</p>
                <h2 className={CARD_TITLE}>
                  检查最终 Prompt
                </h2>
              </div>
              {isFinalPromptModified && (
                <button
                  onClick={() => setFinalPromptOverride("")}
                  className="flex items-center gap-1 text-xs text-neutral-400 transition-colors hover:text-neutral-600"
                >
                  <Icon name="refresh" className="h-3.5 w-3.5" />
                  恢复自动
                </button>
              )}
            </div>

            <div className={`${CARD_SECTION} p-5 sm:p-6`}>
              <div className="flex flex-col gap-3">
                <p className="text-xs leading-relaxed text-neutral-400">
                  这是风格、场景描述和背景设置融合后最终发送给 AI 的完整指令。
                </p>

                <textarea
                  value={displayFinalPrompt}
                  onChange={(event) => setFinalPromptOverride(event.target.value)}
                  rows={8}
                  disabled={isGenerating}
                  className={`${INPUT_CLASS} resize-none text-xs tracking-[0.01em] leading-relaxed ${
                    isFinalPromptModified
                      ? "border-[rgba(217,175,93,0.32)] bg-[rgba(244,238,220,0.55)]"
                      : ""
                  }`}
                />

                {(state.styleDescriptionZh || state.refinedPromptZh) && (
                  <div className="flex gap-2 rounded-[14px] border border-[rgba(43,43,43,0.06)] bg-[#fafaf9] px-3 py-2.5">
                    <span className="mt-0.5 shrink-0 text-xs text-neutral-300">中文</span>
                    <div className="flex flex-col gap-1">
                      {state.styleDescriptionZh && (
                        <p className="text-xs leading-relaxed text-neutral-400">
                          <span className="mr-1 text-neutral-300">风格</span>
                          {state.styleDescriptionZh}
                        </p>
                      )}
                      {state.refinedPromptZh && (
                        <p className="text-xs leading-relaxed text-neutral-500">
                          <span className="mr-1 text-neutral-300">画面</span>
                          {state.refinedPromptZh}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {isFinalPromptModified && (
                  <p className="flex items-center gap-1.5 text-xs text-[#a88234]">
                    <Icon name="edit" className="h-4 w-4" />
                    已手动修改，将直接使用此指令生成。
                  </p>
                )}

                <button
                  onClick={generateImage}
                  disabled={!canGenerate}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-[16px] bg-neutral-900 py-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
                >
                  {isGenerating ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      生成中
                      {state.resultImages.length > 0 && (
                        <span className="text-white/70">
                          （{state.resultImages.length}/{state.imageCount}）
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <Icon name="sparkle" className="h-4 w-4" />
                      生成插画
                      {state.imageCount > 1 && <span className="text-white/70">× {state.imageCount}</span>}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {hasStyle && (
          <div className={CARD_SHELL}>
            <div className="px-5 pt-5 pb-4 sm:px-6">
              <p className={CARD_HEADING}>04 · 生成设置</p>
              <h2 className={CARD_TITLE}>
                调整输出参数
              </h2>
            </div>

            <div className={`${CARD_SECTION} p-5 sm:p-6`}>
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-medium text-neutral-400">比例</span>
                    <div className="flex gap-1.5">
                      {ASPECT_RATIOS.map((ratio) => (
                        <button
                          key={ratio.value}
                          onClick={() => setAspectRatio(ratio.value)}
                          className={`${TILE_BASE} px-2.5 py-1.5 ${
                            state.aspectRatio === ratio.value
                              ? "border-neutral-900 bg-neutral-900 text-white shadow-[0_8px_18px_-14px_rgba(23,23,23,0.7)]"
                              : "border-[rgba(43,43,43,0.06)] bg-[#efefec] text-neutral-600 hover:border-neutral-900/14 hover:bg-[#ebebe8]"
                          }`}
                        >
                          {ratio.label}
                          <span className={`ml-1 ${state.aspectRatio === ratio.value ? "text-white/72" : "text-neutral-400"}`}>
                            {ratio.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-medium text-neutral-400">分辨率</span>
                    <div className="flex gap-1.5">
                      {RESOLUTIONS.map((resolution) => (
                        <button
                          key={resolution.value}
                          onClick={() => setImageResolution(resolution.value)}
                          className={`${TILE_BASE} px-2.5 py-1.5 ${
                            state.imageResolution === resolution.value
                              ? "border-neutral-900 bg-neutral-900 text-white shadow-[0_8px_18px_-14px_rgba(23,23,23,0.7)]"
                              : "border-[rgba(43,43,43,0.06)] bg-[#efefec] text-neutral-600 hover:border-neutral-900/14 hover:bg-[#ebebe8]"
                          }`}
                        >
                          {resolution.label}
                          <span className={`ml-1 ${state.imageResolution === resolution.value ? "text-white/72" : "text-neutral-400"}`}>
                            {resolution.sub}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-medium text-neutral-400">数量</span>
                    <div className="flex gap-1.5">
                      {IMAGE_COUNTS.map((count) => (
                        <button
                          key={count.value}
                          onClick={() => setImageCount(count.value)}
                          className={`${TILE_BASE} px-2.5 py-1.5 ${
                            state.imageCount === count.value
                              ? "border-neutral-900 bg-neutral-900 text-white shadow-[0_8px_18px_-14px_rgba(23,23,23,0.7)]"
                              : "border-[rgba(43,43,43,0.06)] bg-[#efefec] text-neutral-600 hover:border-neutral-900/14 hover:bg-[#ebebe8]"
                          }`}
                        >
                          {count.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex w-full flex-col gap-1.5">
                  <span className="text-[10px] font-medium text-neutral-400">背景处理</span>
                  <div className="flex flex-wrap gap-1.5">
                    {BACKGROUND_MODES.map((mode) => (
                      <button
                        key={mode.value}
                        onClick={() => setBackgroundMode(mode.value)}
                        title={mode.desc}
                        className={`flex items-center gap-1.5 rounded-[14px] border px-2.5 py-1.5 text-[10px] font-medium transition-all ${
                          state.backgroundMode === mode.value
                            ? "border-neutral-900 bg-neutral-900 text-white shadow-[0_8px_18px_-14px_rgba(23,23,23,0.7)]"
                            : "border-[rgba(43,43,43,0.06)] bg-[#efefec] text-neutral-600 hover:border-neutral-900/14 hover:bg-[#ebebe8]"
                        } ${mode.value === "reference" && state.backgroundHints.length > 0 ? "border-[rgba(217,175,93,0.32)]" : ""}`}
                      >
                        <Icon name={mode.icon} className="h-3.5 w-3.5" />
                        {mode.label}
                      </button>
                    ))}
                  </div>

                  {state.backgroundMode === "custom" && (
                    <input
                      type="text"
                      value={state.backgroundCustomText}
                      onChange={(event) => setBackgroundCustomText(event.target.value)}
                      placeholder="描述背景，例如：渐变蓝色、森林场景、简单几何图案..."
                      className={`${INPUT_CLASS} mt-1 text-xs`}
                    />
                  )}

                  <p className="text-xs text-neutral-400">
                    {BACKGROUND_MODES.find((mode) => mode.value === state.backgroundMode)?.desc}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {(isGenerating || hasResults) && (
          <div ref={resultsRef} className={CARD_SHELL}>
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5 pb-4 sm:px-6">
              <div>
                <p className={CARD_HEADING}>05 · 生成结果</p>
              <h2 className={CARD_TITLE}>
                查看结果
              </h2>
              </div>
              {hasResults && !isGenerating && (
                <div className="flex flex-wrap items-center gap-2">
                  {state.resultImages.length > 1 && (
                    <button
                      onClick={handleDownloadAll}
                      className="flex items-center gap-1.5 text-xs text-neutral-500 transition-colors hover:text-neutral-700"
                    >
                      <Icon name="download" className="h-4 w-4" />
                      全部下载
                    </button>
                  )}
                  <button
                    onClick={generateImage}
                    disabled={!canGenerate}
                    className="flex items-center gap-1.5 text-xs text-neutral-500 transition-colors hover:text-neutral-700 disabled:opacity-40"
                  >
                    <Icon name="loop-left" className="h-4 w-4" />
                    重新生成
                  </button>
                </div>
              )}
            </div>

            <div className={`${CARD_SECTION} p-5 sm:p-6`}>
              <div className={`grid gap-3 ${state.imageCount === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
                {state.resultImages.map((img) => (
                  <div
                    key={img.index}
                    className="group relative overflow-hidden rounded-[18px] border border-[rgba(43,43,43,0.08)] bg-[#f6f6f4]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:${img.mimeType};base64,${img.base64}`}
                      alt={`插画 ${img.index + 1}`}
                      className="block h-auto w-full"
                    />
                    <button
                      onClick={() => handleDownload(img.base64, img.mimeType, img.index)}
                      className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-black/58 px-2.5 py-1.5 text-xs font-medium text-white opacity-100 backdrop-blur-sm transition-opacity hover:bg-black/76 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Icon name="download" className="h-4 w-4" />
                      下载
                    </button>
                    {state.imageCount > 1 && (
                      <span className="absolute left-2 top-2 rounded-full bg-black/48 px-2 py-0.5 text-xs text-white backdrop-blur-sm">
                        {img.index + 1}
                      </span>
                    )}
                  </div>
                ))}

                {Array.from({ length: state.pendingCount }).map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-[18px] border border-[rgba(43,43,43,0.08)] bg-[#f6f6f4] animate-pulse"
                  >
                    <div className="h-8 w-8 rounded-full border-2 border-neutral-300 border-t-[#4b88f2] animate-spin" />
                    <span className="text-xs text-neutral-400">AI 创作中...</span>
                  </div>
                ))}
              </div>

              {state.error && !isGenerating && (
                <div className="mt-4">
                  <ErrorAlert message={state.error} onDismiss={clearError} />
                </div>
              )}

              {state.generationFailures > 0 && hasResults && !isGenerating && (
                <div className="mt-4 flex gap-2 rounded-[16px] border border-[rgba(217,175,93,0.25)] bg-[rgba(244,238,220,0.72)] px-4 py-3">
                  <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-[#a88234]" />
                  <p className="text-xs leading-relaxed text-[#8b6c2d]">
                    已成功生成 {state.resultImages.length} 张，另有 {state.generationFailures} 张失败。可点击「重新生成」重试。
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="relative border-t border-white/50 bg-white/28">
        <div className="mx-auto flex w-full max-w-[760px] flex-col gap-0.5 px-4 py-4 text-center sm:px-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500/90">
            Design by QiaoYa
          </p>
          <p className="text-[10px] leading-4 text-neutral-500/80">
            Copyright © 2026 QiaoYa. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
