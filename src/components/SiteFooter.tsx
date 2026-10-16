'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { publicSite } from '@/lib/publicSite'

export default function SiteFooter() {
  const pathname = usePathname()
  const publicPage = pathname === '/' || pathname === '/about' || pathname === '/courses' || pathname.startsWith('/courses/') || ['/help', '/privacy', '/materials', '/contact'].includes(pathname)
  if (!publicPage) return null
  return <footer className="site-footer">
    <div className="site-footer-grid">
      <div className="site-footer-intro">
        <Link href="/" className="site-footer-brand">Bakerversity</Link>
        <p>{publicSite.stage}</p>
        <span className="site-footer-access">{publicSite.access}</span>
      </div>
      <nav aria-label="Footer learning links"><h2>Explore</h2><Link href="/courses">Browse courses</Link><Link href="/about">About Michael &amp; Bakerversity</Link><Link href="/help">Learning here · FAQ</Link></nav>
      <nav aria-label="Footer information links"><h2>Good to know</h2><Link href="/help#accessibility">Accessibility &amp; help</Link><Link href="/materials">Materials &amp; credits</Link><Link href="/privacy">Privacy information</Link><Link href="/contact">Contact Michael</Link></nav>
    </div>
    <div className="site-footer-bottom"><span>© {new Date().getFullYear()} Michael Baker · Bakerversity</span><span>Learn at your own pace.</span></div>
  </footer>
}
