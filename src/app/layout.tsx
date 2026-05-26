import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f5f0' },
    { media: '(prefers-color-scheme: dark)', color: '#070e07' },
  ],
};

export const metadata: Metadata = {
  title: 'RapidStats MY — Malaysia Transit Dashboard',
  description:
    "Daily ridership analytics for Malaysia's Klang Valley rail and bus networks. Batch-updated data from data.gov.my.",
  keywords: [
    'Malaysia',
    'transit',
    'RapidKL',
    'MRT',
    'LRT',
    'ridership',
    'data.gov.my',
    'dashboard',
    'PWA',
  ],
  authors: [{ name: 'RapidStats MY' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TransitMY',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'RapidStats MY — Malaysia Transit Dashboard',
    description: 'Live ridership data for Klang Valley rail & bus networks',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* iOS Safari — Add to Home Screen */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="TransitMY" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Microsoft Edge / Windows Tiles */}
        <meta name="msapplication-TileColor" content="#070e07" />
        <meta name="msapplication-TileImage" content="/icon-192.png" />

        {/* Theme color fallback for browsers that don't support viewport export */}
        <meta name="theme-color" content="#070e07" />

        {/* Register minimal service worker — Chrome requires SW with fetch handler for A2HS install prompt */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[var(--bg-base)] text-[var(--text-primary)]`}
      >
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
