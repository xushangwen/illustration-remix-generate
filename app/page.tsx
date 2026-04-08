"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import imageCompression from "browser-image-compression";
import { KeywordBadge } from "@/components/ui/KeywordBadge";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { isSupportedImageType, downloadBase64Image, generateFileName } from "@/lib/image-utils";
import { useGenerationFlow } from "@/hooks/useGenerationFlow";
import type { AspectRatio, ImageResolution, ImageCount } from "@/lib/types";

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

// ─── 主页面 ───────────────────────────────────────────────────────────────────

export default function Home() {
  const {
    state,
    extractStyle, refinePrompt, editPrompt, generateImage,
    setRefinedPrompt, setAspectRatio, setImageResolution, setImageCount,
    clearError, reset,
  } = useGenerationFlow();

  const [description, setDescription] = useState("");
  const [editRequest, setEditRequest]  = useState("");
  const [styleCopied, setStyleCopied]  = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);
  const descRef    = useRef<HTMLTextAreaElement>(null);

  // 派生状态
  const isExtracting = state.loadingStage === "extract";
  const isRefining   = state.loadingStage === "refine" || state.loadingStage === "edit";
  const isGenerating = state.loadingStage === "generate";
  const hasStyle     = state.styleKeywords.length > 0;
  const hasPrompt    = !!state.refinedPrompt;
  const hasResults   = state.resultImages.length > 0;
  const canGenerate  = hasPrompt && !isGenerating && !isRefining;

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

  // ─── 文件处理 ────────────────────────────────────────────────────────────────

  const handleFile = useCallback(
    async (file: File) => {
      if (!isSupportedImageType(file.type)) return;
      let processedFile = file;
      if (file.size > 2 * 1024 * 1024) {
        try {
          processedFile = await imageCompression(file, {
            maxSizeMB: 2, maxWidthOrHeight: 2048, useWebWorker: true,
          });
        } catch { return; }
      }
      extractStyle(processedFile, URL.createObjectURL(processedFile));
    },
    [extractStyle]
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
    state.resultImages.forEach((img, i) => handleDownload(img.base64, img.mimeType, i));
  };

  const handleCopyStyle = () => {
    navigator.clipboard.writeText(stylePromptText).then(() => {
      setStyleCopied(true);
      setTimeout(() => setStyleCopied(false), 2000);
    });
  };

  // ─── JSX ──────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur-sm">
        <div className="max-w-[720px] mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center">
              <i className="ri-brush-ai-line text-white text-sm" />
            </div>
            <span className="text-sm font-semibold text-neutral-800">插画风格生成器</span>
          </div>
          <div className="flex items-center gap-3">
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

      <main className="flex-1 max-w-[720px] w-full mx-auto px-6 py-7 flex flex-col gap-5">

        {/* ── Card 1：参考风格 ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-1">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">01 · 参考风格</p>
          </div>

          <div className="p-5 flex gap-5">
            {/* 上传区 */}
            {!state.referenceImagePreview ? (
              <div
                {...getRootProps()}
                className={`w-full border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 flex flex-col items-center gap-3 ${
                  isDragActive
                    ? "border-neutral-500 bg-neutral-50"
                    : "border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50"
                }`}
              >
                <input {...getInputProps()} />
                <div className="w-11 h-11 rounded-xl bg-neutral-100 flex items-center justify-center">
                  <i className="ri-image-add-line text-xl text-neutral-500" />
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
                <div className="shrink-0 w-[140px]">
                  <div className="relative w-[140px] h-[140px] rounded-xl overflow-hidden border border-neutral-200 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={state.referenceImagePreview}
                      alt="参考图"
                      className="w-full h-full object-cover"
                    />
                    <div
                      {...getRootProps()}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 cursor-pointer"
                    >
                      <input {...getInputProps()} />
                      <i className="ri-refresh-line text-white text-base" />
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
                            <i className={styleCopied ? "ri-check-line text-green-500" : "ri-file-copy-line"} />
                            {styleCopied ? "已复制" : "复制"}
                          </button>
                        </div>
                        <p className="text-xs text-neutral-500 font-mono bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 leading-relaxed select-all">
                          {stylePromptText}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>

          {state.error && state.loadingStage === null && isExtracting === false && !hasStyle && (
            <div className="px-5 pb-5">
              <ErrorAlert message={state.error} onDismiss={clearError} />
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
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isRefining && state.loadingStage === "refine" ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
                        AI 分析中...
                      </>
                    ) : (
                      <>
                        <i className="ri-magic-line" />
                        AI 生成指令
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
                    <p className="text-xs font-medium text-neutral-400">生图指令（可直接编辑）</p>
                    <textarea
                      value={state.refinedPrompt}
                      onChange={(e) => setRefinedPrompt(e.target.value)}
                      rows={4}
                      disabled={isRefining}
                      className="w-full px-4 py-3 text-sm text-neutral-700 bg-white border border-neutral-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:border-transparent transition-all font-mono leading-relaxed disabled:opacity-60"
                    />
                  </div>

                  {/* AI 修改指令输入 */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editRequest}
                      onChange={(e) => setEditRequest(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !isRefining && handleEdit()}
                      placeholder="继续修改：把主角换成机器人，或加上雪景..."
                      disabled={isRefining}
                      className="flex-1 px-4 py-2.5 text-sm text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:border-transparent transition-all placeholder:text-neutral-400 disabled:opacity-60"
                    />
                    <button
                      onClick={handleEdit}
                      disabled={isRefining || !editRequest.trim()}
                      className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-neutral-700 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                      {isRefining && state.loadingStage === "edit" ? (
                        <div className="w-3.5 h-3.5 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
                      ) : (
                        <i className="ri-edit-ai-line" />
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

        {/* ── Card 3：生成设置 + CTA ──────────────────────────────────────── */}
        {hasStyle && (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm">
            <div className="px-5 pt-5 pb-1">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">03 · 生成设置</p>
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
                    <i className="ri-sparkling-2-line text-base" />
                    生成插画
                    {state.imageCount > 1 && <span className="text-white/70">× {state.imageCount}</span>}
                  </>
                )}
              </button>

              {!hasPrompt && (
                <p className="text-xs text-center text-neutral-400">请先在上方完成场景描述，生成生图指令</p>
              )}
            </div>
          </div>
        )}

        {/* ── Card 4：生成结果 ────────────────────────────────────────────── */}
        {(isGenerating || hasResults) && (
          <div ref={resultsRef} className="bg-white rounded-2xl border border-neutral-200 shadow-sm">
            <div className="px-5 pt-5 pb-1 flex items-center justify-between">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">04 · 生成结果</p>
              {hasResults && !isGenerating && (
                <div className="flex items-center gap-2">
                  {state.resultImages.length > 1 && (
                    <button
                      onClick={handleDownloadAll}
                      className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
                    >
                      <i className="ri-download-line" />
                      全部下载
                    </button>
                  )}
                  <button
                    onClick={generateImage}
                    disabled={!canGenerate}
                    className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-700 transition-colors disabled:opacity-40"
                  >
                    <i className="ri-loop-left-line" />
                    重新生成
                  </button>
                </div>
              )}
            </div>

            <div className="p-5">
              {/* 图片 Grid：真实图 + 骨架屏混排 */}
              <div
                className={`grid gap-3 ${
                  state.imageCount === 1 ? "grid-cols-1" : "grid-cols-2"
                }`}
              >
                {/* 已生成的真实图片 */}
                {state.resultImages.map((img, i) => (
                  <div
                    key={i}
                    className="group relative rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:${img.mimeType};base64,${img.base64}`}
                      alt={`插画 ${i + 1}`}
                      className="w-full h-auto block"
                    />
                    <button
                      onClick={() => handleDownload(img.base64, img.mimeType, i)}
                      className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-black/60 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm hover:bg-black/80"
                    >
                      <i className="ri-download-line" />
                      下载
                    </button>
                    {state.imageCount > 1 && (
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/50 text-white text-xs rounded backdrop-blur-sm">
                        {i + 1}
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
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
