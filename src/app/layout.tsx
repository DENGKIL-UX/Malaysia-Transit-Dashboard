import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';

const geistSans = { variable: '--font-geist-sans' };
const geistMono = { variable: '--font-geist-mono' };

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
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
        {/* ── EARLIEST synchronous shim ─────────────────────────────────────────
            Some client chunks call esbuild's `__name()` keepNames helper without
            bundling the helper itself, which throws "Uncaught ReferenceError:
            __name is not defined" and kills hydration/charts. This must run
            SYNCHRONOUSLY, before any other inline script or async chunk, so it is
            a raw <script> in <head> — NOT next/script, whose `beforeInteractive`
            strategy is deferred to the `self.__next_s` queue (executed too late).
            Keep first in <head> so nothing can run before it. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function () {
              if (typeof __name !== 'function') {
                var define = Object.defineProperty;
                globalThis.__name = function (target, value) {
                  try { define(target, 'name', { value: value, configurable: true }); }
                  catch (_) { /* ignore non-extensible targets */ }
                  return target;
                };
              }
            })();`,
          }}
        />

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
        <Script
          id="sw-register"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                var registerSw = function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                };
                if (document.readyState === 'complete') {
                  registerSw();
                } else {
                  window.addEventListener('load', registerSw);
                }
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
