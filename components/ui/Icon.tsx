"use client";

import type { HTMLAttributes } from "react";

export type IconName =
  | "alert"
  | "brush-ai"
  | "check"
  | "close"
  | "contrast"
  | "copy"
  | "download"
  | "edit"
  | "edit-ai"
  | "error"
  | "image"
  | "image-add"
  | "loop-left"
  | "magic"
  | "refresh"
  | "sparkle"
  | "subtract";

type IconProps = HTMLAttributes<HTMLElement> & {
  name: IconName;
};

const remixiconClassMap: Record<IconName, string> = {
  alert: "ri-alert-line",
  "brush-ai": "ri-brush-ai-line",
  check: "ri-check-line",
  close: "ri-close-line",
  contrast: "ri-contrast-2-line",
  copy: "ri-file-copy-line",
  download: "ri-download-line",
  edit: "ri-edit-line",
  "edit-ai": "ri-edit-ai-line",
  error: "ri-error-warning-line",
  image: "ri-image-line",
  "image-add": "ri-image-add-line",
  "loop-left": "ri-loop-left-line",
  magic: "ri-magic-line",
  refresh: "ri-refresh-line",
  sparkle: "ri-sparkling-2-line",
  subtract: "ri-subtract-line",
};

export function Icon({ name, className, ...props }: IconProps) {
  return (
    <span
      className={[
        "inline-flex items-center justify-center align-middle leading-none not-italic",
        className,
      ].filter(Boolean).join(" ")}
      aria-hidden={props["aria-label"] ? undefined : true}
      {...props}
    >
      <i className={[remixiconClassMap[name], "leading-none not-italic"].join(" ")} />
    </span>
  );
}
