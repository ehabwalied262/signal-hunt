import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/layout/theme-provider';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'SignalHunt — Sales Dialer',
  description: 'Outbound sales dialer and lightweight CRM for B2B teams',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {/* ThemeProvider runs on the client to restore saved theme on mount */}
        <ThemeProvider />
        {children}
      </body>
    </html>
  );
}