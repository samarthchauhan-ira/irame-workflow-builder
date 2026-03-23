import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Irame.ai – Workflow Builder',
  description: 'Build custom audit workflows with AI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 antialiased">{children}</body>
    </html>
  );
}
