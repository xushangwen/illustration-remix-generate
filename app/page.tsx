"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import imageCompression from "browser-image-compression";
import { Icon, type IconName } from "@/components/ui/Icon";
import { KeywordBadge } from "@/components/ui/KeywordBadge";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { isSupportedImageType, downloadBase64Image, generateFileName, MAX_UPLOAD_BYTES } from "@/lib/image-utils";
import { useGenerationFlow } from "@/hooks/useGenerationFlow";
import { buildFinalImagePromptWithReference } from "@/lib/prompts";
import type { AspectRatio, ImageResolution, ImageCount, BackgroundMode } from "@/lib/types";

// ─── 选项配置 ────────────────────────────────────────────────────────────────

const ASPECT_RATIOS: { value: AspectRatio; label: string; desc: string }[] = [
  { value: "1:1",  label: "1:1",  desc: "方形" },
  { value: "16:9", label: "16:9", desc: "横版" },
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

const BACKGROUND_MODES: { value: BackgroundMode; label: string; desc: string; icon: IconName }[] = [
  { value: "reference", label: "参照原图", desc: "保留参考图背景风格", icon: "image" },
  { value: "clean",     label: "干净背景", desc: "白色/浅色简洁背景",  icon: "contrast" },
  { value: "isolated",  label: "无背景",   desc: "纯主体，适合图标",   icon: "subtract" },
  { value: "custom",    label: "自定义",   desc: "描述你想要的背景",   icon: "edit" },
];

// ─── 主页面 ───────────────────────────────────────────────────────────────────

export default function Home() {
  const {
    state,
    extractStyle, refinePrompt, editPrompt, generateImage,
    setRefinedPrompt, setFinalPromptOverride,
    setAspectRatio, setImageResolution, setImageCount,
    setBackgroundMode, setBackgroundCustomText,
    clearError, reset,
  } = useGenerationFlow();

  const [description, setDescription] = useState("");
  const [editRequest, setEditRequest]  = useState("");
  const [styleCopyState, setStyleCopyState] = useState<"idle" | "success" | "error">("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);

  const resultsRef = useRef<HTMLDivElement>(null);
  const descRef    = useRef<HTMLTextAreaElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  // 派生状态
  const isExtracting = state.loadingStage === "extract";
  const isRefining   = state.loadingStage === "refine" || state.loadingStage === "edit";
  const isGenerating = state.loadingStage === "generate";
  const hasStyle     = state.styleKeywords.length > 0;
  const hasPrompt    = !!state.refinedPrompt;
  const hasResults   = state.resultImages.length > 0;
  const canGenerate  = hasPrompt && !isGenerating && !isRefining;
  const step1Error = uploadError ?? (state.loadingStage === null && !hasStyle ? state.error : null);

  // 客户端实时计算最终融合提示词，供预览卡片展示
  // 背景设置变更时自动重新计算；若用户已手动修改则显示手动值
  const computedFinalPrompt = hasPrompt
    ? buildFinalImagePromptWithReference(
        state.refinedPrompt,
        state.styleKeywords,
        state.styleDescription,
        state.backgroundMode,
        state.backgroundCustomText,
        state.backgroundHints
      )
    : "";
  const displayFinalPrompt = state.finalPromptOverride || computedFinalPrompt;
  const isFinalPromptModified = !!state.finalPromptOverride && state.finalPromptOverride !== computedFinalPrompt;

  // 风格提取结果 → 可复制的提示词字符串
  const stylePromptText = hasStyle
    ? [state.styleDescription, state.styleKeywords.join(", ")].filter(Boolean).join(". ")
    : "";

  // 图片分析完成后，聚焦描述输入框
  useEffect(() => {
    if (hasStyle && !hasPrompt) {
      setTimeout(() => descRef.current?.focus(), 200);
    }
  }, [hasStyle, hasPrompt]);

  // 生成开始时，平滑滚动到结果区域
  useEffect(() => {
    if (isGenerating) {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [isGenerating]);

  // 重置时同步清空本地描述状态
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

  // ─── 文件处理 ────────────────────────────────────────────────────────────────

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
            maxSizeMB: 2, maxWidthOrHeight: 2048, useWebWorker: true,
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
    [clearError, extractStyle]
  );

  // 粘贴图片（Cmd+V / Ctrl+V）
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isExtracting) return;
      for (const item of Array.from(e.clipboardData?.items ?? [])) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) { handleFile(f); break; }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [isExtracting, handleFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files[0] && handleFile(files[0]),
    accept: { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"] },
    multiple: false,
    disabled: isExtracting,
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────────

  const handleRefine = () => {
    if (description.trim()) refinePrompt(description.trim());
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
    state.resultImages.forEach((img) => handleDownload(img.base64, img.mimeType, img.index));
  };

  const handleCopyStyle = () => {
    navigator.clipboard.writeText(stylePromptText)
      .then(() => {
        setStyleCopyState("success");
        setTimeout(() => setStyleCopyState("idle"), 2000);
      })
      .catch(() => {
        setStyleCopyState("error");
        setTimeout(() => setStyleCopyState("idle"), 2500);
      });
  };

  // ─── JSX ──────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[720px] flex-wrap items-center justify-between gap-2 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center">
              <Icon name="brush-ai" className="h-4 w-4 text-base text-white" />
            </div>
            <span className="text-sm font-semibold text-neutral-800">插画风格生成器</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-neutral-400">由 Gemini 驱动</span>
            {(hasStyle || hasResults) && (
              <button
                onClick={reset}
                className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                重置
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-5 px-4 py-7 sm:px-6">

        {/* ── Card 1：参考风格 ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-1">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">01 · 参考风格</p>
          </div>

          <div className="flex flex-col gap-5 p-5 sm:flex-row">
            {/* 上传区 */}
            {!state.referenceImagePreview ? (
              <div
                {...getRootProps({
                  role: "button",
                  tabIndex: 0,
                  "aria-label": "上传参考插画，可拖拽、点击或粘贴",
                  "aria-busy": isExtracting,
                })}
                className={`flex w-full cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 sm:p-10 ${
                  isDragActive
                    ? "border-neutral-500 bg-neutral-50"
                    : "border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50"
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100">
                  <Icon name="image-add" className="h-5 w-5 text-neutral-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-700">
                    {isDragActive ? "松开上传" : "拖拽 / 点击 / ⌘V 粘贴参考插画"}
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">JPG · PNG · WebP，最大 10MB</p>
                </div>
              </div>
            ) : (
              <>
                {/* 已上传图片缩略图 */}
                <div className="w-full shrink-0 sm:w-[140px]">
                  <div className="group relative aspect-square w-full overflow-hidden rounded-xl border border-neutral-200 sm:h-[140px] sm:w-[140px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={state.referenceImagePreview}
                      alt="参考图"
                      className="w-full h-full object-cover"
                    />
                    <div
                      {...getRootProps({
                        role: "button",
                        tabIndex: 0,
                        "aria-label": "重新上传参考插画",
                      })}
                      className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-1 bg-black/50 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <input {...getInputProps()} />
                      <Icon name="refresh" className="h-4 w-4 text-white" />
                      <span className="text-white text-xs">换图</span>
                    </div>
                  </div>
                </div>

                {/* 风格分析结果 */}
                <div className="flex-1 min-w-0">
                  {isExtracting ? (
                    <div className="flex items-center gap-2.5 py-4">
                      <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin shrink-0" />
                      <span className="text-sm text-neutral-500">正在分析风格特征...</span>
                    </div>
                  ) : hasStyle ? (
                    <div className="flex flex-col gap-3">
                      {/* 关键词 */}
                      <div>
                        <p className="text-xs text-neutral-400 mb-2 font-medium">风格特征</p>
                        <div className="flex flex-wrap gap-1.5">
                          {state.styleKeywords.map((kw) => (
                            <KeywordBadge key={kw} keyword={kw} />
                          ))}
                        </div>
                      </div>

                      {/* 提取的提示词（可复制）*/}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs text-neutral-400 font-medium">风格提示词</p>
                          <button
                            onClick={handleCopyStyle}
                            className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
                          >
                            <Icon
                              name={styleCopyState === "success" ? "check" : "copy"}
                              className={styleCopyState === "success" ? "h-3.5 w-3.5 text-green-500" : "h-3.5 w-3.5"}
                            />
                            {styleCopyState === "success" ? "已复制" : styleCopyState === "error" ? "复制失败" : "复制"}
                          </button>
                        </div>
                        <p className="text-xs text-neutral-500 font-mono bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 leading-relaxed select-all">
                          {stylePromptText}
                        </p>
                        {styleCopyState === "error" && (
                          <p className="mt-1.5 text-xs text-red-500">浏览器未允许剪贴板写入，请手动复制。</p>
                        )}
                        {/* 中文风格摘要 */}
                        {state.styleDescriptionZh && (
                          <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                            <span className="text-neutral-300 mr-1">中文</span>
                            {state.styleDescriptionZh}
                          </p>
                        )}
                      </div>

                      {/* 背景元素预警：检测到背景元素时提示用户 */}
                      {state.backgroundHints.length > 0 && (
                        <div className="flex gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                          <div>
                            <p className="text-xs font-medium text-amber-700">检测到背景元素</p>
                            <p className="text-xs text-amber-600 mt-0.5">
                              {state.backgroundHints.join("、")}
                            </p>
                            <p className="text-xs text-amber-500 mt-1">
                              若不想要这些背景，在「生成设置」里切换背景模式
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

          {step1Error && (
            <div className="px-5 pb-5">
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

        {/* ── Card 2：描述 + Prompt ───────────────────────────────────────── */}
        {hasStyle && (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm">
            <div className="px-5 pt-5 pb-1">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">02 · 描述新主题</p>
            </div>

            <div className="p-5 flex flex-col gap-4">
              {/* 描述输入 */}
              <div className="flex flex-col gap-2">
                <textarea
                  ref={descRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleRefine();
                  }}
                  placeholder="保持上面的风格，画一个啤酒杯…&#10;或：一只猫坐在城市屋顶上，俯瞰夜景…"
                  rows={3}
                  disabled={isRefining}
                  className="w-full px-4 py-3 text-sm text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:border-transparent transition-all placeholder:text-neutral-400 disabled:opacity-60 leading-relaxed"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleRefine}
                    disabled={isRefining || !description.trim()}
                    className="flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isRefining && state.loadingStage === "refine" ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
                        AI 分析中...
                      </>
                    ) : (
                      <>
                        <Icon name="magic" className="h-4 w-4" />
                        优化措辞
                        <span className="text-xs opacity-40">⌘↵</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 精化后的 Prompt */}
              {hasPrompt && (
                <>
                  <div className="border-t border-neutral-100 pt-4 flex flex-col gap-2">
                    <p className="text-xs font-medium text-neutral-400">场景描述（英文，可直接编辑）</p>
                    <textarea
                      value={state.refinedPrompt}
                      onChange={(e) => setRefinedPrompt(e.target.value)}
                      rows={4}
                      disabled={isRefining}
                      className="w-full px-4 py-3 text-sm text-neutral-700 bg-white border border-neutral-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:border-transparent transition-all font-mono leading-relaxed disabled:opacity-60"
                    />
                    {/* 中文对照 */}
                    {state.refinedPromptZh && (
                      <div className="flex gap-2 px-3 py-2 bg-neutral-50 border border-neutral-100 rounded-lg">
                        <span className="text-xs text-neutral-300 shrink-0 mt-0.5">中文</span>
                        <p className="text-xs text-neutral-500 leading-relaxed">{state.refinedPromptZh}</p>
                      </div>
                    )}
                  </div>

                  {/* AI 修改指令输入 */}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={editRequest}
                      onChange={(e) => setEditRequest(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !isRefining && handleEdit()}
                      placeholder="修改描述：把主角换成机器人、去掉背景里的树..."
                      disabled={isRefining}
                      className="flex-1 px-4 py-2.5 text-sm text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:border-transparent transition-all placeholder:text-neutral-400 disabled:opacity-60"
                    />
                    <button
                      onClick={handleEdit}
                      disabled={isRefining || !editRequest.trim()}
                      className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isRefining && state.loadingStage === "edit" ? (
                        <div className="w-3.5 h-3.5 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
                      ) : (
                        <Icon name="edit-ai" className="h-4 w-4" />
                      )}
                      AI 修改
                    </button>
                  </div>
                </>
              )}

              {state.error && (state.loadingStage === null) && (hasStyle) && (
                <ErrorAlert message={state.error} onDismiss={clearError} />
              )}
            </div>
          </div>
        )}

        {/* ── Card 3：最终生图指令预览 ───────────────────────────────────── */}
        {hasPrompt && (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5 pb-1">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">03 · 最终生图指令</p>
              {isFinalPromptModified && (
                <button
                  onClick={() => setFinalPromptOverride("")}
                  className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors flex items-center gap-1"
                >
                  <Icon name="refresh" className="h-3.5 w-3.5" />
                  恢复自动
                </button>
              )}
            </div>

            <div className="p-5 flex flex-col gap-3">
              <p className="text-xs text-neutral-400 leading-relaxed">
                这是风格 + 场景描述 + 背景设置融合后、最终发送给 AI 的完整指令。确认无误后点击生成。
              </p>

              {/* 完整指令（可编辑）*/}
              <textarea
                value={displayFinalPrompt}
                onChange={(e) => setFinalPromptOverride(e.target.value)}
                rows={8}
                disabled={isGenerating}
                className={`w-full px-4 py-3 text-xs text-neutral-700 bg-neutral-50 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:border-transparent transition-all font-mono leading-relaxed disabled:opacity-60 ${
                  isFinalPromptModified ? "border-amber-300 bg-amber-50/30" : "border-neutral-200"
                }`}
              />

              {/* 中文参考摘要 */}
              {(state.styleDescriptionZh || state.refinedPromptZh) && (
                <div className="flex gap-2 px-3 py-2.5 bg-neutral-50 border border-neutral-100 rounded-lg">
                  <span className="text-xs text-neutral-300 shrink-0 mt-0.5">中文</span>
                  <div className="flex flex-col gap-1">
                    {state.styleDescriptionZh && (
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        <span className="text-neutral-300 mr-1">风格</span>{state.styleDescriptionZh}
                      </p>
                    )}
                    {state.refinedPromptZh && (
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        <span className="text-neutral-300 mr-1">画面</span>{state.refinedPromptZh}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {isFinalPromptModified && (
                <p className="text-xs text-amber-600 flex items-center gap-1.5">
                  <Icon name="edit" className="h-4 w-4" />
                  已手动修改，将直接使用此指令生成，不再自动计算
                </p>
              )}

              {/* 生成按钮 */}
              <button
                onClick={generateImage}
                disabled={!canGenerate}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-neutral-800 text-white text-sm font-semibold rounded-xl hover:bg-neutral-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
        )}

        {/* ── Card 4：生成设置 ────────────────────────────────────────────── */}
        {hasStyle && (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm">
            <div className="px-5 pt-5 pb-1">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">04 · 生成设置</p>
            </div>

            <div className="p-5 flex flex-col gap-4">
              {/* 设置行 */}
              <div className="flex flex-wrap gap-4">
                {/* 比例 */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-neutral-400 font-medium">比例</span>
                  <div className="flex gap-1.5">
                    {ASPECT_RATIOS.map((r) => (
                      <button
                        key={r.value}
                        onClick={() => setAspectRatio(r.value)}
                        className={`px-3.5 py-2 rounded-lg border text-xs font-medium transition-all ${
                          state.aspectRatio === r.value
                            ? "bg-neutral-800 text-white border-neutral-800"
                            : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                        }`}
                      >
                        {r.label}
                        <span className={`ml-1 ${state.aspectRatio === r.value ? "opacity-60" : "text-neutral-400"}`}>
                          {r.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 分辨率 */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-neutral-400 font-medium">分辨率</span>
                  <div className="flex gap-1.5">
                    {RESOLUTIONS.map((r) => (
                      <button
                        key={r.value}
                        onClick={() => setImageResolution(r.value)}
                        className={`px-3.5 py-2 rounded-lg border text-xs font-medium transition-all ${
                          state.imageResolution === r.value
                            ? "bg-neutral-800 text-white border-neutral-800"
                            : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                        }`}
                      >
                        {r.label}
                        <span className={`ml-1 ${state.imageResolution === r.value ? "opacity-60" : "text-neutral-400"}`}>
                          {r.sub}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 数量 */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-neutral-400 font-medium">数量</span>
                  <div className="flex gap-1.5">
                    {IMAGE_COUNTS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setImageCount(c.value)}
                        className={`px-3.5 py-2 rounded-lg border text-xs font-medium transition-all ${
                          state.imageCount === c.value
                            ? "bg-neutral-800 text-white border-neutral-800"
                            : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

                {/* 背景控制 */}
                <div className="flex flex-col gap-1.5 w-full">
                  <span className="text-xs text-neutral-400 font-medium">背景处理</span>
                  <div className="flex flex-wrap gap-1.5">
                    {BACKGROUND_MODES.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => setBackgroundMode(m.value)}
                        title={m.desc}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-medium transition-all ${
                          state.backgroundMode === m.value
                            ? "bg-neutral-800 text-white border-neutral-800"
                            : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                        } ${m.value === "reference" && state.backgroundHints.length > 0 ? "border-amber-300" : ""}`}
                      >
                        <Icon name={m.icon} className="h-4 w-4" />
                        {m.label}
                      </button>
                    ))}
                  </div>
                  {/* 自定义背景描述输入 */}
                  {state.backgroundMode === "custom" && (
                    <input
                      type="text"
                      value={state.backgroundCustomText}
                      onChange={(e) => setBackgroundCustomText(e.target.value)}
                      placeholder="描述背景，例如：渐变蓝色、森林场景、简单几何图案..."
                      className="w-full mt-1 px-3.5 py-2.5 text-xs text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-300 transition-all placeholder:text-neutral-400"
                    />
                  )}
                  {/* 背景模式说明 */}
                  <p className="text-xs text-neutral-400">
                    {BACKGROUND_MODES.find((m) => m.value === state.backgroundMode)?.desc}
                  </p>
                </div>

            </div>
          </div>
        )}

        {/* ── Card 5：生成结果 ────────────────────────────────────────────── */}
        {(isGenerating || hasResults) && (
          <div ref={resultsRef} className="bg-white rounded-2xl border border-neutral-200 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5 pb-1">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">05 · 生成结果</p>
              {hasResults && !isGenerating && (
                <div className="flex flex-wrap items-center gap-2">
                  {state.resultImages.length > 1 && (
                    <button
                      onClick={handleDownloadAll}
                      className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
                    >
                      <Icon name="download" className="h-4 w-4" />
                      全部下载
                    </button>
                  )}
                  <button
                    onClick={generateImage}
                    disabled={!canGenerate}
                    className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-700 transition-colors disabled:opacity-40"
                  >
                    <Icon name="loop-left" className="h-4 w-4" />
                    重新生成
                  </button>
                </div>
              )}
            </div>

            <div className="p-5">
              {/* 图片 Grid：真实图 + 骨架屏混排 */}
              <div
                className={`grid gap-3 ${
                  state.imageCount === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"
                }`}
              >
                {/* 已生成的真实图片 */}
                {state.resultImages.map((img) => (
                  <div
                    key={img.index}
                    className="group relative rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:${img.mimeType};base64,${img.base64}`}
                      alt={`插画 ${img.index + 1}`}
                      className="w-full h-auto block"
                    />
                    <button
                      onClick={() => handleDownload(img.base64, img.mimeType, img.index)}
                      className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1.5 text-xs font-medium text-white opacity-100 backdrop-blur-sm transition-opacity hover:bg-black/80 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Icon name="download" className="h-4 w-4" />
                      下载
                    </button>
                    {state.imageCount > 1 && (
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/50 text-white text-xs rounded backdrop-blur-sm">
                        {img.index + 1}
                      </span>
                    )}
                  </div>
                ))}

                {/* 骨架屏占位：还在生成中的图片槽 */}
                {Array.from({ length: state.pendingCount }).map((_, i) => (
                  <div
                    key={`skeleton-${i}`}
                    className="rounded-xl border border-neutral-200 bg-neutral-100 animate-pulse flex flex-col items-center justify-center gap-3 min-h-[200px]"
                  >
                    <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-500 rounded-full animate-spin" />
                    <span className="text-xs text-neutral-400">
                      AI 创作中...
                    </span>
                  </div>
                ))}
              </div>

              {/* 生成失败错误提示 */}
              {state.error && !isGenerating && (
                <div className="mt-4">
                  <ErrorAlert message={state.error} onDismiss={clearError} />
                </div>
              )}

              {state.generationFailures > 0 && hasResults && !isGenerating && (
                <div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <p className="text-xs leading-relaxed text-amber-700">
                    已成功生成 {state.resultImages.length} 张，另有 {state.generationFailures} 张失败。可点击「重新生成」重试。
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
