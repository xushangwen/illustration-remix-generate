"use client";

import { useState } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { AspectRatio } from "@/lib/types";

interface Step2DescribeProps {
  loading: boolean;
  error: string | null;
  userDescription: string;
  refinedPrompt: string;
  aspectRatio: AspectRatio;
  onRefinePrompt: (description: string) => void;
  onRefinedPromptChange: (prompt: string) => void;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  onGenerate: () => void;
  onBack: () => void;
  onClearError: () => void;
}

const ASPECT_RATIOS: { value: AspectRatio; label: string; icon: string }[] = [
  { value: "16:9", label: "横版", icon: "ri-landscape-line" },
  { value: "1:1", label: "方形", icon: "ri-checkbox-blank-line" },
  { value: "9:16", label: "竖版", icon: "ri-smartphone-line" },
];

export function Step2Describe({
  loading,
  error,
  userDescription,
  refinedPrompt,
  aspectRatio,
  onRefinePrompt,
  onRefinedPromptChange,
  onAspectRatioChange,
  onGenerate,
  onBack,
  onClearError,
}: Step2DescribeProps) {
  const [description, setDescription] = useState(userDescription);

  const handleRefine = () => {
    if (!description.trim()) return;
    onRefinePrompt(description);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-800 mb-1">描述你的场景</h2>
        <p className="text-sm text-neutral-500">随意描述你想要的画面，AI 会帮你理解并转化为精准的生图指令</p>
      </div>

      {/* 场景描述输入 */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
          场景描述
        </label>
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
        <LoadingSpinner message="正在理解场景描述..." />
      ) : refinedPrompt ? (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
            精准生图指令（可编辑）
          </label>
          <textarea
            value={refinedPrompt}
            onChange={(e) => onRefinedPromptChange(e.target.value)}
            rows={5}
            className="w-full px-4 py-3 text-sm text-neutral-700 bg-white border border-neutral-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:border-transparent transition-all font-mono leading-relaxed"
          />
        </div>
      ) : null}

      {/* 宽高比选择 */}
      {refinedPrompt && !loading && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
            生成比例
          </label>
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
      )}

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
          </button>
        )}
      </div>
    </div>
  );
}
