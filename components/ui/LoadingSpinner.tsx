"use client";

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-800 rounded-full animate-spin" />
      {message && (
        <p className="text-sm text-neutral-500">{message}</p>
      )}
    </div>
  );
}
