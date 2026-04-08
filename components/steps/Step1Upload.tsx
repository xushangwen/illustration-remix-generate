"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import imageCompression from "browser-image-compression";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { KeywordBadge } from "@/components/ui/KeywordBadge";
import { isSupportedImageType } from "@/lib/image-utils";

interface Step1UploadProps {
  loading: boolean;
  error: string | null;
  referenceImagePreview: string | null;
  styleKeywords: string[];
  styleDescription: string;
  onUpload: (file: File, previewUrl: string) => void;
  onNext: () => void;
  onClearError: () => void;
}

export function Step1Upload({
  loading,
  error,
  referenceImagePreview,
  styleKeywords,
  styleDescription,
  onUpload,
  onNext,
  onClearError,
}: Step1UploadProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setLocalError(null);

      if (!isSupportedImageType(file.type)) {
        setLocalError("不支持的格式，请上传 JPG、PNG 或 WebP 图片");
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
          setLocalError("图片压缩失败，请尝试更小的文件");
          return;
        }
      }

      const previewUrl = URL.createObjectURL(processedFile);
      onUpload(processedFile, previewUrl);
    },
    [onUpload]
  );

  // 支持 Ctrl+V / Cmd+V 粘贴图片
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (loading) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            handleFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [loading, handleFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles[0]) handleFile(acceptedFiles[0]);
    },
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    multiple: false,
    disabled: loading,
  });

  // 将提取结果格式化为可复制的提示词字符串
  const extractedPromptText =
    styleKeywords.length > 0
      ? [styleDescription, styleKeywords.join(", ")].filter(Boolean).join(". ")
      : "";

  const handleCopyPrompt = () => {
    if (!extractedPromptText) return;
    navigator.clipboard.writeText(extractedPromptText).then(() => {
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    });
  };

  const displayError = localError ?? error;
  const hasResult = styleKeywords.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-800 mb-1">上传参考插画</h2>
        <p className="text-sm text-neutral-500">
          上传一张插画，AI 将提取其视觉风格特征 —— 支持拖拽、点击选择或 <kbd className="px-1.5 py-0.5 text-xs bg-neutral-100 border border-neutral-200 rounded font-mono">⌘V</kbd> 粘贴
        </p>
      </div>

      {/* 上传区域 */}
      {!referenceImagePreview ? (
        <div
          {...getRootProps()}
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
            isDragActive
              ? "border-neutral-600 bg-neutral-50"
              : "border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50"
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center">
              <i className="ri-image-add-line text-xl text-neutral-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-700">
                {isDragActive ? "松开鼠标上传" : "拖拽图片到此处，或点击选择"}
              </p>
              <p className="text-xs text-neutral-400 mt-1">支持 JPG / PNG / WebP，最大 10MB，或直接粘贴</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex gap-4">
          {/* 已上传图片预览 */}
          <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-neutral-200 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={referenceImagePreview} alt="参考图" className="w-full h-full object-cover" />
            <div
              {...getRootProps()}
              className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            >
              <input {...getInputProps()} />
              <span className="text-white text-xs font-medium">重新上传</span>
            </div>
          </div>

          {/* 分析状态 / 结果 */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <LoadingSpinner message="正在分析插画风格..." />
            ) : hasResult ? (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-xs text-neutral-400 mb-2 font-medium uppercase tracking-wide">提取到的风格特征</p>
                  <div className="flex flex-wrap gap-2">
                    {styleKeywords.map((kw) => (
                      <KeywordBadge key={kw} keyword={kw} />
                    ))}
                  </div>
                </div>
                {styleDescription && (
                  <p className="text-xs text-neutral-500 italic leading-relaxed">"{styleDescription}"</p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 分析提示词展示（可复制） */}
      {extractedPromptText && !loading && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              分析提示词
            </label>
            <button
              onClick={handleCopyPrompt}
              className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
            >
              <i className={promptCopied ? "ri-check-line text-green-600" : "ri-file-copy-line"} />
              {promptCopied ? "已复制" : "复制"}
            </button>
          </div>
          <div className="px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-600 font-mono leading-relaxed select-all">
            {extractedPromptText}
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {displayError && (
        <ErrorAlert
          message={displayError}
          onDismiss={() => {
            setLocalError(null);
            onClearError();
          }}
        />
      )}

      {/* 下一步按钮 */}
      {hasResult && !loading && (
        <div className="flex justify-end">
          <button
            onClick={onNext}
            className="flex items-center gap-2 px-5 py-2.5 bg-neutral-800 text-white text-sm font-medium rounded-xl hover:bg-neutral-700 transition-colors"
          >
            下一步
            <i className="ri-arrow-right-line" />
          </button>
        </div>
      )}
    </div>
  );
}
