import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '700', '800'], variable: '--font-inter' })

export const metadata: Metadata = {
  metadataBase: new URL('https://thinkinggames.com'),
  title: { default: 'Thinking Games Initiative', template: '%s · Thinking Games Initiative' },
  description: 'Curated puzzles and strategy games that build the mathematical mind.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
