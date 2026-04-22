import type { Metadata } from 'next';
import './globals.css';
import { resolvePublicConfig } from '@/lib/publicConfig';

export const metadata: Metadata = {
  title: 'Consumer — Age Verification Demo',
  description: 'Demo UI for a consumer that wants a user age-verified.',
};

// Re-evaluate per request so container env var changes take effect on next refresh.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cfg = resolvePublicConfig();
  return (
    <html lang="en">
      <head>
        <script
          id="app-config"
          // Serialised with JSON.stringify — no user-controlled data, safe to inline.
          dangerouslySetInnerHTML={{
            __html: `window.__APP_CONFIG__=${JSON.stringify(cfg)};`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
