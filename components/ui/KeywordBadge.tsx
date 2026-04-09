"use client";

interface KeywordBadgeProps {
  keyword: string;
}

export function KeywordBadge({ keyword }: KeywordBadgeProps) {
  return (
    <span className="inline-flex items-center rounded-full border border-[rgba(43,43,43,0.08)] bg-[#f5f6f8] px-3 py-1.5 text-[11px] font-medium text-neutral-600">
      {keyword}
    </span>
  );
}
