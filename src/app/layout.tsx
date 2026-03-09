import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Header } from '@/components/layout/header';
import 'leaflet/dist/leaflet.css';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Siena Maps Platform',
  description: 'Internal map publishing and governance platform for Siena University',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased min-h-screen`}>
        <Header />
        <main className="app-main">{children}</main>
      </body>
    </html>
  );
}
