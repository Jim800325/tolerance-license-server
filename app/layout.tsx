import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '智能公差计算器 v7.2',
  description: '智能公差计算器在线授权加固版 v7.2',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
