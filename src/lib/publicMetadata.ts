import type { Metadata } from 'next'

const siteUrl = 'https://bakerversity.vercel.app'

/** Each public page supplies its own URL and preview copy to avoid inherited home-page previews. */
export function publicMetadata(title: string, description: string, path: string): Metadata {
  const url = new URL(path, siteUrl).toString()
  const shareTitle = `${title} · Bakerversity`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'website', siteName: 'Bakerversity', title: shareTitle, description, url },
    twitter: { card: 'summary', title: shareTitle, description },
  }
}
