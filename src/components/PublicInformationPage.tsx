import SiteNav from '@/components/SiteNav'
import Link from 'next/link'

export default function PublicInformationPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return <><a className="skip-link" href="#main-content">Skip to content</a><SiteNav /><main id="main-content" tabIndex={-1} className="public-information"><Link href="/" className="public-information-back">← Bakerversity</Link><header><h1>{title}</h1><p>{intro}</p></header><div className="public-information-body">{children}</div></main></>
}
