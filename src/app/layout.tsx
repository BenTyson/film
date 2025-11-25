import type { Metadata } from 'next'
import { Inter, Poppins } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { Providers } from '@/components/providers'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const poppins = Poppins({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins',
})

export const metadata: Metadata = {
  title: 'Cinematekka',
  description: 'Track and organize your personal movie collection with a premium streaming service interface',
  keywords: 'movies, tracking, collection, oscar, awards, personal, cinema',
  authors: [{ name: 'Your Name' }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#3b82f6',
          colorBackground: '#0a0a0a',
          colorInputBackground: '#1a1a1a',
          colorInputText: '#ffffff',
          colorText: '#ffffff',
        },
        layout: {
          socialButtonsVariant: 'iconButton',
        },
      }}
    >
      <html lang="en" className="dark">
        <body className={`${inter.variable} ${poppins.variable} font-sans antialiased`}>
          <Providers>
            <div className="min-h-screen bg-background text-foreground">
              <main>
                {children}
              </main>
            </div>
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  )
}
