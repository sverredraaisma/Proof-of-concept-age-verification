import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Age Provider — Demo',
  description: 'Demo UI for the age verification provider.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
