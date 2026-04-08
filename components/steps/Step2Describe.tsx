"use client";

import { useState } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { AspectRatio, ImageResolution, ImageCount } from "@/lib/types";

interface Step2DescribeProps {
  loading: boolean;
  error: string | null;
  userDescription: string;
  refinedPrompt: string;
  aspectRatio: AspectRatio;
  imageResolution: ImageResolution;
  imageCount: ImageCount;
  onRefinePrompt: (description: string) => void;
  onEditPrompt: (editRequest: string) => void;
  onRefinedPromptChange: (prompt: string) => void;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  onImageResolutionChange: (resolution: ImageResolution) => void;
  onImageCountChange: (count: ImageCount) => void;
  onGenerate: () => void;
  onBack: () => void;
  onClearError: () => void;
}

const ASPECT_RATIOS: { value: AspectRatio; label: string; icon: string }[] = [
  { value: "16:9", label: "横版", icon: "ri-landscape-line" },
  { value: "1:1", label: "方形", icon: "ri-checkbox-blank-line" },
  { value: "9:16", label: "竖版", icon: "ri-smartphone-line" },
];

const RESOLUTIONS: { value: ImageResolution; label: string; hint: string }[] = [
  { value: "1K", label: "1K", hint: "~1024px" },
  { value: "2K", label: "2K", hint: "~2048px" },
  { value: "4K", label: "4K", hint: "~4096px" },
];

const IMAGE_COUNTS: { value: ImageCount; label: string }[] = [
  { value: 1, label: "1 张" },
  { value: 2, label: "2 张" },
  { value: 4, label: "4 张" },
];

export function Step2Describe({
  loading,
  error,
  userDescription,
  refinedPrompt,
  aspectRatio,
  imageResolution,
  imageCount,
  onRefinePrompt,
  onEditPrompt,
  onRefinedPromptChange,
  onAspectRatioChange,
  onImageResolutionChange,
  onImageCountChange,
  onGenerate,
  onBack,
  onClearError,
}: Step2DescribeProps) {
  const [description, setDescription] = useState(userDescription);
  const [editRequest, setEditRequest] = useState("");

  const handleRefine = () => {
    if (!description.trim()) return;
    onRefinePrompt(description);
  };

  const handleEditPrompt = () => {
    if (!editRequest.trim()) return;
    onEditPrompt(editRequest);
    setEditRequest("");
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-800 mb-1">描述你的场景</h2>
        <p className="text-sm text-neutral-500">随意描述你想要的画面，AI 会帮你理解并转化为精准的生图指令</p>
      </div>

      {/* 场景描述输入 */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">场景描述</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="例如：一个女孩坐在咖啡馆窗边，窗外在下雨，她在看书，感觉很宁静..."
          rows={4}
          disabled={loading}
          className="w-full px-4 py-3 text-sm text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:border-transparent transition-all placeholder:text-neutral-400 disabled:opacity-60"
        />
        <div className="flex justify-end">
          <button
            onClick={handleRefine}
            disabled={loading || !description.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <i className="ri-magic-line" />
            AI 理解并优化
          </button>
        </div>
      </div>

      {/* AI 精化 Prompt */}
      {loading ? (
        <LoadingSpinner message="AI 正在处理..." />
      ) : refinedPrompt ? (
        <>
          {/* 精化后的 Prompt 可编辑 */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              精准生图指令（可直接编辑）
            </label>
            <textarea
              value={refinedPrompt}
              onChange={(e) => onRefinedPromptChange(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 text-sm text-neutral-700 bg-white border border-neutral-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:border-transparent transition-all font-mono leading-relaxed"
            />
          </div>

          {/* 提示词优化输入：在现有 Prompt 基础上描述修改需求 */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              AI 优化指令 <span className="normal-case text-neutral-400">（描述你想修改的部分）</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={editRequest}
                onChange={(e) => setEditRequest(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && handleEditPrompt()}
                placeholder="例如：把女孩改成男孩，背景换成公园..."
                disabled={loading}
                className="flex-1 px-4 py-2.5 text-sm text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:border-transparent transition-all placeholder:text-neutral-400 disabled:opacity-60"
              />
              <button
                onClick={handleEditPrompt}
                disabled={loading || !editRequest.trim()}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-neutral-700 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <i className="ri-edit-ai-line" />
                优化
              </button>
            </div>
          </div>

          {/* 生成比例 */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">生成比例</label>
            <div className="flex gap-2">
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio.value}
                  onClick={() => onAspectRatioChange(ratio.value)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    aspectRatio === ratio.value
                      ? "bg-neutral-800 text-white border-neutral-800"
                      : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  <i className={ratio.icon} />
                  {ratio.label}
                  <span className="text-xs opacity-60">{ratio.value}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 分辨率选择 */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">分辨率</label>
            <div className="flex gap-2">
              {RESOLUTIONS.map((res) => (
                <button
                  key={res.value}
                  onClick={() => onImageResolutionChange(res.value)}
                  className={`flex flex-col items-center px-5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    imageResolution === res.value
                      ? "bg-neutral-800 text-white border-neutral-800"
                      : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  <span>{res.label}</span>
                  <span className={`text-xs mt-0.5 ${imageResolution === res.value ? "opacity-60" : "text-neutral-400"}`}>
                    {res.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 生成数量 */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">生成数量</label>
            <div className="flex gap-2">
              {IMAGE_COUNTS.map((cnt) => (
                <button
                  key={cnt.value}
                  onClick={() => onImageCountChange(cnt.value)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    imageCount === cnt.value
                      ? "bg-neutral-800 text-white border-neutral-800"
                      : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  <i className="ri-image-line" />
                  {cnt.label}
                </button>
              ))}
            </div>
            {imageCount > 1 && (
              <p className="text-xs text-neutral-400">
                {imageCount} 张图片将并行生成，耗时约为单张的 1–1.5 倍
              </p>
            )}
          </div>
        </>
      ) : null}

      {/* 错误提示 */}
      {error && <ErrorAlert message={error} onDismiss={onClearError} />}

      {/* 操作按钮 */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          <i className="ri-arrow-left-line" />
          返回
        </button>

        {refinedPrompt && !loading && (
          <button
            onClick={onGenerate}
            className="flex items-center gap-2 px-5 py-2.5 bg-neutral-800 text-white text-sm font-medium rounded-xl hover:bg-neutral-700 transition-colors"
          >
            <i className="ri-sparkling-line" />
            生成插画
            {imageCount > 1 && <span className="opacity-70">×{imageCount}</span>}
          </button>
        )}
      </div>
    </div>
  );
}
