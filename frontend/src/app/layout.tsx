import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Navbar from "@/components/Navbar";
import AuthProvider from "@/components/AuthProvider";
import SmoothScroll from "@/components/SmoothScroll";
import ThemeProvider from "@/components/ThemeProvider";
import CustomCursor from "@/components/ui/CustomCursor";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NeonArcade — Play Beyond",
  description: "The future of browser gaming. Play beyond limits.",
  other: {
    "google-adsense-account": "ca-pub-9814325246389127",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      suppressHydrationWarning
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        {/* apply the saved theme before first paint so there is no flash */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('neonarcade-theme')||'dark';document.documentElement.dataset.theme=t;}catch(e){}",
          }}
        />
      </head>
      <body className="flex min-h-full flex-col text-text-primary">
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9814325246389127"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
        <ThemeProvider>
        <AuthProvider>
          <SmoothScroll />
          <CustomCursor />
          <div className="noise-overlay" />
          <Navbar />
          <main className="relative z-10 flex-1">{children}</main>
        </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
