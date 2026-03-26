import type { Metadata } from 'next'
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/lib/i18n'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

// AFTER
export const metadata: Metadata = {
  title: "INTELDASH — Personal World View Dashboard",
  description: "One dashboard to track everything that matters to you — markets, geopolitics, crypto, and global risk, filtered through your life.",
  metadataBase: new URL("https://intel-dashboard-snowy.vercel.app"),
  openGraph: {
    title: "INTELDASH — Personal World View Dashboard",
    description: "One dashboard to track everything that matters to you — markets, geopolitics, crypto, and global risk, filtered through your life.",
    url: "https://intel-dashboard-snowy.vercel.app",
    siteName: "INTELDASH",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "INTELDASH Dashboard Preview" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "INTELDASH — Personal World View Dashboard",
    description: "One dashboard to track everything that matters to you.",
    images: ["/og-image.png"],
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-intel-bg text-intel-text antialiased">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  )
}
