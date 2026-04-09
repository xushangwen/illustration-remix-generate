"use client";

import { Icon } from "@/components/ui/Icon";

interface ErrorAlertProps {
  message: string;
  onDismiss?: () => void;
}

export function ErrorAlert({ message, onDismiss }: ErrorAlertProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-start gap-3 rounded-[16px] border border-[rgba(191,103,94,0.2)] bg-[rgba(252,244,243,0.92)] p-4 text-sm text-[rgb(151,83,76)]"
    >
      <Icon name="error" className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="关闭错误提示"
          className="shrink-0 transition-colors hover:text-[rgb(125,65,58)]"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
