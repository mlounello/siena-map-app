import type { Metadata } from 'next';
import { Gudea, Merriweather, Oswald } from 'next/font/google';
import { Header } from '@/components/layout/header';
import 'leaflet/dist/leaflet.css';
import './globals.css';

const oswald = Oswald({
  subsets: ['latin'],
  variable: '--font-oswald',
  display: 'swap',
});

const gudea = Gudea({
  subsets: ['latin'],
  variable: '--font-gudea',
  weight: ['400', '700'],
  display: 'swap',
});

const merriweather = Merriweather({
  subsets: ['latin'],
  variable: '--font-merriweather',
  weight: ['300', '400', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Siena Maps Platform',
  description: 'Internal map publishing and governance platform for Siena University',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${oswald.variable} ${gudea.variable} ${merriweather.variable}`}>
        <Header />
        <main className="app-main">{children}</main>
      </body>
    </html>
  );
}
