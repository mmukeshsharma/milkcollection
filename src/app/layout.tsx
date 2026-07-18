import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sharma Dairy",
  description: "Modern dairy operations dashboard",
};

import { LanguageProvider } from "@/context/LanguageContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${geistSans.variable}`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <LanguageProvider>
          {children}
        </LanguageProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                  navigator.serviceWorker.getRegistrations().then(function(regs) {
                    for (let reg of regs) {
                      reg.unregister();
                      console.log('Unregistered active development service worker');
                    }
                  });
                  if ('caches' in window) {
                    caches.keys().then(function(keys) {
                      for (let key of keys) {
                        caches.delete(key);
                      }
                      console.log('Cleared development cache storage');
                    });
                  }
                } else {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').catch(function(err) {
                      console.error('ServiceWorker registration failed:', err);
                    });
                  });
                }
              }
            `
          }}
        />
      </body>
    </html>
  );
}
