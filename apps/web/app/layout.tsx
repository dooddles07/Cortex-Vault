import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { ColdStartNotice } from "@/components/cold-start-notice";
import { ThemeAccountSync } from "@/components/theme-account-sync";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/lib/auth";
import { SITE_URL } from "@/lib/site";
import { ThemeProvider, ThemeScript } from "@/lib/theme";
import "./globals.css";

// Inter is the only font in the critical path. Display and mono are subset and
// deferred - see docs/DESIGN.md section 3 loading budget.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

const DESCRIPTION =
  "Your second brain, with receipts. Capture everything, then ask it anything - every answer cites the exact source chunk it came from.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "CortexVault",
  description: DESCRIPTION,
  openGraph: {
    title: "CortexVault",
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "CortexVault",
    images: [{ url: "/og-image.jpg", width: 1200, height: 632 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CortexVault",
    description: DESCRIPTION,
    images: ["/og-image.jpg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // zoom is never disabled
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // themeScript writes data-theme onto this element before paint, so the
    // server markup and the first client render legitimately differ.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${display.variable} ${mono.variable}`}
    >
      <head>
        <ThemeScript />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[90] focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-label focus:shadow-e3"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          <AuthProvider>
            <ThemeAccountSync />
            <ToastProvider>
              <ColdStartNotice />
              {children}
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
