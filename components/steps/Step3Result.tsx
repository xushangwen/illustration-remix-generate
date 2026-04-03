"use client";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { downloadBase64Image, generateFileName } from "@/lib/image-utils";

interface Step3ResultProps {
  loading: boolean;
  error: string | null;
  resultImageBase64: string | null;
  resultMimeType: string | null;
  onRegenerate: () => void;
  onReset: () => void;
  onClearError: () => void;
}

export function Step3Result({
  loading,
  error,
  resultImageBase64,
  resultMimeType,
  onRegenerate,
  onReset,
  onClearError,
}: Step3ResultProps) {
  const handleDownload = () => {
    if (!resultImageBase64 || !resultMimeType) return;
    downloadBase64Image(resultImageBase64, resultMimeType, generateFileName("illustration", resultMimeType));
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-800 mb-1">生成结果</h2>
        <p className="text-sm text-neutral-500">2K 分辨率插画已生成，可下载或重新生成</p>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="flex flex-col items-center gap-4 py-16 border-2 border-dashed border-neutral-200 rounded-2xl">
          <LoadingSpinner />
          <div className="text-center">
            <p className="text-sm font-medium text-neutral-700">正在生成 2K 插画...</p>
            <p className="text-xs text-neutral-400 mt-1">通常需要 15-30 秒，请耐心等待</p>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && !loading && <ErrorAlert message={error} onDismiss={onClearError} />}

      {/* 生成结果 */}
      {resultImageBase64 && !loading && (
        <div className="flex flex-col gap-4">
          <div className="relative rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:${resultMimeType};base64,${resultImageBase64}`}
              alt="生成的插画"
              className="w-full h-auto"
            />
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-between">
            <button
              onClick={onReset}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
            >
              <i className="ri-refresh-line" />
              重新开始
            </button>

            <div className="flex gap-2">
              <button
                onClick={onRegenerate}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-neutral-700 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors"
              >
                <i className="ri-loop-left-line" />
                重新生成
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-5 py-2.5 bg-neutral-800 text-white text-sm font-medium rounded-xl hover:bg-neutral-700 transition-colors"
              >
                <i className="ri-download-line" />
                下载 PNG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 初始等待状态（未开始生成） */}
      {!loading && !resultImageBase64 && !error && (
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
