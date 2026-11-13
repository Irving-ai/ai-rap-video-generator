import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Rap Video Generator — From Creative Ideas to Video Generation Workflows',
  description: 'Plan rap videos with editable creative briefs, shot sequences, and prompts. Connect your own video API to generate individual shots.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
