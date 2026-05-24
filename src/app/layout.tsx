import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RapidStats MY — Malaysia Transit Dashboard",
  description:
    "Daily ridership analytics for Malaysia's Klang Valley rail and bus networks. Real-time data from data.gov.my.",
  keywords: [
    "Malaysia",
    "transit",
    "RapidKL",
    "MRT",
    "LRT",
    "ridership",
    "data.gov.my",
    "dashboard",
  ],
  authors: [{ name: "RapidStats MY" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "RapidStats MY — Malaysia Transit Dashboard",
    description: "Live ridership data for Klang Valley rail & bus networks",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
