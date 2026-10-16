import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { DM_Sans, DM_Serif_Display } from 'next/font/google'
import ThemeProvider from '@/components/ThemeProvider'
import './globals.css'
import SiteFooter from '@/components/SiteFooter'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const dmSerifDisplay = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Bakerversity',
    template: '%s · Bakerversity',
  },
  description: 'Free, self-paced courses in technical subjects. Read lessons without an account.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${dmSans.variable} ${dmSerifDisplay.variable}`}
        suppressHydrationWarning
      >
        <head>
          {/* Load both hljs themes; globals.css overrides hljs vars per data-theme */}
          <link
            rel="stylesheet"
            href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.0/styles/github-dark.min.css"
          />
        </head>
        <body>
          <ThemeProvider>
            {children}
            <SiteFooter />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
