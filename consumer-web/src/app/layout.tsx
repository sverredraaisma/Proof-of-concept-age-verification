import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Consumer — Age Verification Demo',
  description: 'Demo UI for a consumer that wants a user age-verified.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
