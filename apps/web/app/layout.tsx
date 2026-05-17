import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'IB Marketplace — European B2B & B2G Commerce',
  description: 'KYB-Verified · 20 Countries · Location-Aware · EU GDPR + UK GDPR Compliant',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
