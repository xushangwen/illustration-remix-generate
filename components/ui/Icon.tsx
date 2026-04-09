"use client";

import type { ReactNode, SVGProps } from "react";

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

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
};

const iconPaths: Record<IconName, ReactNode> = {
  alert: (
    <>
      <path d="M12 3.5 2.7 20h18.6L12 3.5Z" />
      <path d="M12 9v5.25" />
      <path d="M12 17.25h.01" />
    </>
  ),
  "brush-ai": (
    <>
      <path d="M14 4.5a2.5 2.5 0 0 1 3.54 3.54l-6.72 6.72a4 4 0 0 1-2.26 1.13l-2.76.46.46-2.76a4 4 0 0 1 1.13-2.26L14 4.5Z" />
      <path d="M4.5 19.5c.5-1.7 1.62-2.87 3.37-3.5" />
      <path d="M18.5 4.5v2" />
      <path d="M17.5 5.5h2" />
    </>
  ),
  check: <path d="m5 12.5 4.25 4.25L19 7" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  contrast: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16Z" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="10" height="10" rx="2" />
      <path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v10" />
      <path d="m8.5 10.5 3.5 3.5 3.5-3.5" />
      <path d="M4 18.5h16" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4.75L19 9.75 14.25 5 4 15.25V20Z" />
      <path d="m12.75 6.5 4.75 4.75" />
    </>
  ),
  "edit-ai": (
    <>
      <path d="M4 20h4.5L18 10.5 13.5 6 4 15.5V20Z" />
      <path d="m12.5 7 4.5 4.5" />
      <path d="M19 4v2" />
      <path d="M18 5h2" />
    </>
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.25" />
      <path d="M12 16.5h.01" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <circle cx="9" cy="10" r="1.25" />
      <path d="m6 16 3.75-3.75L13 15.5l2.5-2.5L18 16" />
    </>
  ),
  "image-add": (
    <>
      <rect x="3.5" y="7" width="13" height="11" rx="2.5" />
      <circle cx="8.5" cy="11" r="1" />
      <path d="m6.5 16 2.75-2.75L12 16" />
      <path d="M18.5 5v6" />
      <path d="M15.5 8h6" />
    </>
  ),
  "loop-left": (
    <>
      <path d="M9 7H5v4" />
      <path d="M5.5 11A7 7 0 1 0 8 6.8" />
    </>
  ),
  magic: (
    <>
      <path d="m5 19 8.5-8.5" />
      <path d="m12 4 1 2.5L15.5 7.5 13 8.5 12 11l-1-2.5L8.5 7.5 11 6.5 12 4Z" />
      <path d="m17.5 13.5.7 1.7 1.8.8-1.8.7-.7 1.8-.8-1.8-1.7-.7 1.7-.8.8-1.7Z" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-14-4" />
      <path d="M4 4v5h5" />
      <path d="M4 13a8 8 0 0 0 14 4" />
      <path d="M20 20v-5h-5" />
    </>
  ),
  sparkle: (
    <>
      <path d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z" />
      <path d="m18.5 15 .8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8.8-1.9Z" />
    </>
  ),
  subtract: (
    <>
      <rect x="3.5" y="6" width="17" height="12" rx="2.5" />
      <path d="M8 12h8" />
    </>
  ),
};

export function Icon({ name, className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props["aria-label"] ? undefined : true}
      className={className}
      {...props}
    >
      {iconPaths[name]}
    </svg>
  );
}
