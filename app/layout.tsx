import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: 'Perplex — Protocol Analytics & Smart Money Intelligence for Perpl on Monad',
  description:
    'Perplex is the Nansen/Arkham of Perpl: protocol analytics, wallet intelligence, and smart money scoring for the fully on-chain perp CLOB on Monad.',
  keywords: ['Perpl', 'Monad', 'Perpetuals', 'DeFi', 'Analytics', 'Smart Money', 'CLOB'],
  openGraph: {
    title: 'Perplex — Smart Money Radar for Perpl',
    description: 'Protocol Analytics & Smart Money Intelligence for Perpl on Monad.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#0A0A0F',
  width: 'device-width',
  initialScale: 1,
};

/**
 * Root layout — HTML shell + Inter + global styles only.
 * The /app workspace adds its own Sidebar/Navbar shell in app/app/layout.tsx;
 * the landing page at / renders its own LandingNavbar/Footer.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans text-textPrimary antialiased">
        {children}
      </body>
    </html>
  );
}
