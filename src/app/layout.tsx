import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'CabinetPilot',
  description: 'Pilotez vos missions juridiques en un coup d\'œil',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Cal Sans — non disponible sur Google Fonts, chargé depuis CDN */}
        <link
          rel="stylesheet"
          href="https://fonts.cdnfonts.com/css/cal-sans"
        />
      </head>
      <body className={`${dmSans.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
