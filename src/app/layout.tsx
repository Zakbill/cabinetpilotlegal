import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
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
    <html
      lang="fr"
      className={geistSans.variable}
      suppressHydrationWarning
    >
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
