import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "插画风格生成器",
  description: "上传参考插画，AI 提取风格，描述场景，生成同风格 2K 插画",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
