import type { Metadata } from 'next';
import './globals.css';
import { resolvePublicConfig } from '@/lib/publicConfig';

export const metadata: Metadata = {
  title: 'Age Provider — Demo',
  description: 'Demo UI for the age verification provider.',
};

export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cfg = resolvePublicConfig();
  return (
    <html lang="en">
      <head>
        <script
          id="app-config"
          dangerouslySetInnerHTML={{
            __html: `window.__APP_CONFIG__=${JSON.stringify(cfg)};`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
