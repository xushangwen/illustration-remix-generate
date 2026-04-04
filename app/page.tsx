"use client";

import { useCallback } from "react";
import { useGenerationFlow } from "@/hooks/useGenerationFlow";
import { StepIndicator } from "@/components/StepIndicator";
import { Step1Upload } from "@/components/steps/Step1Upload";
import { Step2Describe } from "@/components/steps/Step2Describe";
import { Step3Result } from "@/components/steps/Step3Result";

export default function Home() {
  const {
    state,
    extractStyle,
    refinePrompt,
    generateImage,
    setRefinedPrompt,
    setAspectRatio,
    goToStep,
    reset,
  } = useGenerationFlow();

  const clearError = useCallback(() => {
    // 通过 dispatch SET_ERROR null 清除错误
    // 这里直接利用 goToStep 同一步骤来清除 error（reducer 会重置 error）
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶部 Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* 点击 logo 区域回到初始状态，step=1 时无需 reset */}
          <button
            onClick={() => state.step !== 1 && reset()}
            className="flex items-center gap-2.5 group"
            aria-label="回到首页"
          >
            <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center group-hover:bg-neutral-700 transition-colors">
              <i className="ri-brush-ai-line text-white text-sm" />
            </div>
            <span className="text-sm font-semibold text-neutral-800 group-hover:text-neutral-600 transition-colors">插画风格生成器</span>
          </button>
          <span className="text-xs text-neutral-400">由 Gemini 驱动</span>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col items-center py-10 px-6">
        <div className="w-full max-w-2xl flex flex-col gap-8">
          {/* 步骤指示器 */}
          <StepIndicator currentStep={state.step} />

          {/* 步骤内容卡片 */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
            {state.step === 1 && (
              <Step1Upload
                loading={state.loading}
                error={state.error}
                referenceImagePreview={state.referenceImagePreview}
                styleKeywords={state.styleKeywords}
                styleDescription={state.styleDescription}
                onUpload={extractStyle}
                onNext={() => goToStep(2)}
                onClearError={clearError}
              />
            )}

            {state.step === 2 && (
              <Step2Describe
                loading={state.loading}
                error={state.error}
                userDescription={state.userDescription}
                refinedPrompt={state.refinedPrompt}
                aspectRatio={state.aspectRatio}
                onRefinePrompt={refinePrompt}
                onRefinedPromptChange={setRefinedPrompt}
                onAspectRatioChange={setAspectRatio}
                onGenerate={async () => {
                  goToStep(3);
                  await generateImage();
                }}
                onBack={() => goToStep(1)}
                onClearError={clearError}
              />
            )}

            {state.step === 3 && (
              <Step3Result
                loading={state.loading}
                error={state.error}
                resultImageBase64={state.resultImageBase64}
                resultMimeType={state.resultMimeType}
                onRegenerate={generateImage}
                onReset={reset}
                onClearError={clearError}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
