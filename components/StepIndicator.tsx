"use client";

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
}

const STEPS = [
  { number: 1, label: "上传参考图" },
  { number: 2, label: "描述场景" },
  { number: 3, label: "生成插画" },
];

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0">
      {STEPS.map((step, index) => {
        const isCompleted = step.number < currentStep;
        const isActive = step.number === currentStep;

        return (
          <div key={step.number} className="flex items-center">
            <div className="flex flex-col items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                  isCompleted
                    ? "bg-neutral-800 text-white"
                    : isActive
                    ? "bg-neutral-800 text-white ring-4 ring-neutral-200"
                    : "bg-neutral-100 text-neutral-400"
                }`}
              >
                {isCompleted ? (
                  <i className="ri-check-line text-sm" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`text-xs whitespace-nowrap transition-colors duration-300 ${
                  isActive ? "text-neutral-800 font-medium" : "text-neutral-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`w-16 h-px mx-3 mb-5 transition-colors duration-300 ${
                  step.number < currentStep ? "bg-neutral-800" : "bg-neutral-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
