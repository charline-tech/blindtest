import type { Metadata } from "next"
import { Bebas_Neue } from 'next/font/google'
import "./globals.css"

const bebas = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "Les Trésors de Wallonie — Blind Test",
  description: "Blind test musical en temps réel",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={bebas.variable}>
      <body className="antialiased">{children}</body>
    </html>
  )
}
