"use client";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { downloadBase64Image, generateFileName } from "@/lib/image-utils";
import { ResultImage } from "@/lib/types";

interface Step3ResultProps {
  loading: boolean;
  error: string | null;
  resultImages: ResultImage[];
  imageCount: number;
  onRegenerate: () => void;
  onReset: () => void;
  onClearError: () => void;
}

export function Step3Result({
  loading,
  error,
  resultImages,
  imageCount,
  onRegenerate,
  onReset,
  onClearError,
}: Step3ResultProps) {
  const handleDownload = (image: ResultImage, index: number) => {
    downloadBase64Image(
      image.base64,
      image.mimeType,
      generateFileName(`illustration_${index + 1}`, image.mimeType)
    );
  };

  const handleDownloadAll = () => {
    resultImages.forEach((img, i) => handleDownload(img, i));
  };

  // 根据图片数量决定布局：1张全宽，2张双列，4张2×2
  const gridClass =
    resultImages.length === 1
      ? "grid grid-cols-1"
      : resultImages.length === 2
      ? "grid grid-cols-2 gap-3"
      : "grid grid-cols-2 gap-3";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-800 mb-1">生成结果</h2>
        <p className="text-sm text-neutral-500">
          {loading
            ? "正在并行生成插画，请耐心等待..."
            : resultImages.length > 0
            ? `共生成 ${resultImages.length} 张插画`
            : "生成结果将在这里展示"}
        </p>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="flex flex-col items-center gap-4 py-16 border-2 border-dashed border-neutral-200 rounded-2xl">
          <LoadingSpinner />
          <div className="text-center">
            <p className="text-sm font-medium text-neutral-700">
              正在生成{imageCount > 1 ? ` ${imageCount} 张` : ""}插画...
            </p>
            <p className="text-xs text-neutral-400 mt-1">通常需要 15–45 秒，请耐心等待</p>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && !loading && <ErrorAlert message={error} onDismiss={onClearError} />}

      {/* 生成结果 Grid */}
      {resultImages.length > 0 && !loading && (
        <div className="flex flex-col gap-4">
          <div className={gridClass}>
            {resultImages.map((img, index) => (
              <div key={index} className="group relative rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:${img.mimeType};base64,${img.base64}`}
                  alt={`生成的插画 ${index + 1}`}
                  className="w-full h-auto block"
                />
                {/* 悬停下载按钮 */}
                <button
                  onClick={() => handleDownload(img, index)}
                  className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm hover:bg-black/80"
                >
                  <i className="ri-download-line" />
                  下载
                </button>
                {resultImages.length > 1 && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 text-white text-xs rounded-md backdrop-blur-sm">
                    {index + 1}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* 操作按钮行 */}
          <div className="flex items-center justify-between gap-4">
            {/* 重新开始 — aurora 渐变样式 */}
            <button
              onClick={onReset}
              className="btn-ai-restart flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300"
            >
              <i className="ri-home-5-line text-base" />
              重新开始
            </button>

            <div className="h-8 w-px bg-neutral-200 flex-shrink-0" />

            <div className="flex gap-2">
              <button
                onClick={onRegenerate}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-neutral-700 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors"
              >
                <i className="ri-loop-left-line" />
                重新生成
              </button>

              {resultImages.length > 1 ? (
                <button
                  onClick={handleDownloadAll}
                  className="flex items-center gap-2 px-5 py-2.5 bg-neutral-800 text-white text-sm font-medium rounded-xl hover:bg-neutral-700 transition-colors"
                >
                  <i className="ri-download-line" />
                  全部下载
                </button>
              ) : (
                <button
                  onClick={() => handleDownload(resultImages[0], 0)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-neutral-800 text-white text-sm font-medium rounded-xl hover:bg-neutral-700 transition-colors"
                >
                  <i className="ri-download-line" />
                  下载
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 初始等待状态（未开始生成） */}
      {!loading && resultImages.length === 0 && !error && (
        <div className="flex flex-col items-center gap-4 py-16 border-2 border-dashed border-neutral-200 rounded-2xl">
          <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center">
            <i className="ri-image-line text-xl text-neutral-400" />
          </div>
          <p className="text-sm text-neutral-400">生成结果将在这里展示</p>
        </div>
      )}
    </div>
  );
}
