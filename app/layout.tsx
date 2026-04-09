import type { Metadata } from "next";
import "@fontsource-variable/space-grotesk/wght.css";
import "@ibm/plex-sans-sc/css/ibm-plex-sans-sc-all.css";
import "remixicon/fonts/remixicon.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://illustration-remix-generate.local"),
  title: {
    default: "插画风格生成器",
    template: "%s | 插画风格生成器",
  },
  description: "上传参考插画，AI 提取风格并生成同风格新插画，支持背景控制、多图生成与提示词二次修改。",
  applicationName: "插画风格生成器",
  keywords: ["AI 插画", "风格参考", "Gemini", "提示词生成", "图像生成"],
  openGraph: {
    title: "插画风格生成器",
    description: "上传参考插画，提取风格并生成新的同风格插画。",
    siteName: "插画风格生成器",
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "插画风格生成器",
    description: "上传参考插画，提取风格并生成新的同风格插画。",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
