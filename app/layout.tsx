import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'AOS — Alain Operating System',
  description: 'A personal operating system for ambitious execution.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="h-full bg-[#0a0a0c] text-[#e8e8f0] antialiased">
        <TooltipProvider>
          <div className="flex h-full min-h-screen">
            <Sidebar />
            {/* Offset for sidebar: 64px mobile, 224px lg */}
            <main className="flex-1 pl-16 lg:pl-56">
              <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
                {children}
              </div>
            </main>
          </div>
        </TooltipProvider>
      </body>
    </html>
  )
}
