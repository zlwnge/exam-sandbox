import React from 'react';

export const metadata = {
  title: '考公高保真精细化时空复盘沙箱',
  description: '100%单机物理隔离数据安全仓',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}