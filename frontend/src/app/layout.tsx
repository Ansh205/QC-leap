import type { Metadata } from 'next'
import './globals.css'
import { Geist } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'

const geist = Geist({
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'QC-Leap',
  description: 'Transform Quality Control with AI',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={geist.className}>
      <body>
        <main>{children}</main>
        <Toaster />
      </body>
    </html>
  )
}
