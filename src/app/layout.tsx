import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { StructuredData } from "@/components/seo/structured-data";

// Google Tag Manager ID
const GTM_ID = "GTM-TPQ89ZS5";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://marketingbureau.kz"),
  title: "SEO · GEO · AEO аудит сайта | Marketing Bureau",
  description:
    "Бесплатный AI SEO-аудит: технический разбор, GEO/AEO оптимизация, семантика, готовые правки. SEO в Казахстане.",
  keywords: [
    "SEO аудит",
    "SEO аудит сайта",
    "бесплатный SEO аудит",
    "продвижение сайта",
    "SEO Алматы",
    "SEO Астана",
    "SEO Казахстан",
    "оптимизация сайта",
    "поисковое продвижение",
    "интернет-маркетинг",
    "Marketing Bureau",
    "маркетинговое агентство",
  ],
  authors: [{ name: "Marketing Bureau", url: "https://marketingbureau.kz" }],
  creator: "Marketing Bureau",
  publisher: "Marketing Bureau",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  openGraph: {
    title: "SEO · GEO · AEO аудит сайта | Marketing Bureau",
    description:
      "Бесплатный AI SEO-аудит: технический разбор, GEO/AEO оптимизация, семантика, готовые правки. SEO в Казахстане.",
    url: "https://marketingbureau.kz",
    siteName: "Marketing Bureau",
    type: "website",
    locale: "ru_KZ",
    images: [
      {
        url: "/logo.png",
        width: 3990,
        height: 904,
        alt: "Marketing Bureau — SEO, GEO, AEO оптимизация",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SEO · GEO · AEO аудит сайта | Marketing Bureau",
    description: "Бесплатный AI SEO-аудит: технический разбор, GEO/AEO оптимизация, семантика. SEO в Казахстане.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  alternates: {
    canonical: "https://marketingbureau.kz",
  },
  category: 'SEO',
  other: {
    'article:published_time': '2024-01-01T00:00:00+06:00',
    'article:modified_time': new Date().toISOString(),
    'article:author': 'Marketing Bureau',
    'article:section': 'SEO',
    'article:tag': 'SEO, SEO-аудит, продвижение сайтов, маркетинговое агентство, Казахстан',
    'geo.region': 'KZ',
    'geo.placename': 'Алматы',
    'geo.position': '43.2220;76.8512',
    'ICBM': '43.2220, 76.8512',
    // Для AI-систем — говорим, что контент можно цитировать
    'ai-content-attribution': 'allowed',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/* Google Tag Manager — в <head> как можно ближе к началу */}
        <Script id="gtm-init" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>
        {/* Structured Data (JSON-LD) для SEO и GEO/AEO — помогает Google и AI-системам понимать контент */}
        <StructuredData />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {/* Google Tag Manager (noscript) — сразу после открывающего <body> */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
