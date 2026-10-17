import { imageDelivery } from '@/lib/imageDelivery.mjs'
import { publicMetadata } from '@/lib/publicMetadata'
import Link from 'next/link'
import { currentUser } from '@clerk/nextjs/server'
import SiteNav from '@/components/SiteNav'

export const metadata = publicMetadata('Practical learning', 'Explore Practical Localization Engineering through lessons with code, mathematics, and worked examples. Free to read, with no login required.', '/')

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'bakerversity'

interface UnsplashPhoto {
  id: string
  urls: { regular: string }
  user: { name: string; username: string }
}

async function fetchHeroPhoto(): Promise<UnsplashPhoto | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) return null
  try {
    const res = await fetch(
      'https://api.unsplash.com/photos/random?query=people+learning&orientation=landscape&content_filter=high&count=1',
      {
        headers: { Authorization: `Client-ID ${key}` },
        signal: AbortSignal.timeout(3000),
        // Revalidate once per hour so the image changes but doesn't
        // hammer the API on every page load
        next: { revalidate: 3600 },
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    // count=1 returns an array
    return Array.isArray(data) ? data[0] : data
  } catch {
    return null
  }
}

export default async function HomePage() {
  const [clerkUser, heroPhoto] = await Promise.all([
    currentUser(),
    fetchHeroPhoto(),
  ])

  const photographerUrl = heroPhoto
    ? `https://unsplash.com/@${heroPhoto.user.username}?utm_source=${APP_NAME}&utm_medium=referral`
    : null
  const unsplashUrl = `https://unsplash.com/?utm_source=${APP_NAME}&utm_medium=referral`

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <SiteNav />
      <main id="main-content" tabIndex={-1} className="site-shell">
        {/* Hero */}
        <section style={{
          padding: 'clamp(4rem, 10vw, 8rem) 1.5rem',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          // Fall back to plain bg if no photo
          background: heroPhoto ? '#18231b' : 'var(--bg)',
        }}>
          {/* Background image */}
          {heroPhoto && (
            <>
              <img {...imageDelivery(heroPhoto.urls.regular, '100vw')} alt="" fetchPriority="high" loading="eager" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />
              {/* Dark overlay so text stays readable */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.52)',
                zIndex: 1,
              }} />
            </>
          )}

          {/* Content — above overlay */}
          <div style={{ maxWidth: 680, margin: '0 auto', position: 'relative', zIndex: 2 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              background: heroPhoto ? 'rgba(255,255,255,0.15)' : 'var(--amber-muted)',
              borderRadius: 'var(--radius-full)',
              fontSize: 12,
              fontWeight: 600,
              color: heroPhoto ? 'rgba(255,255,255,0.9)' : 'var(--amber-ink)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '1.5rem',
            }}>
              ✦ Free & open to explore
            </div>

            <h1 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(2.5rem, 6vw, 4rem)',
              lineHeight: 1.1,
              margin: '0 0 1.25rem',
              color: heroPhoto ? '#fff' : 'var(--text)',
              textShadow: heroPhoto ? '0 2px 12px rgba(0,0,0,0.4)' : 'none',
            }}>
              Build practical
              <br />
              <span style={{ color: heroPhoto ? 'var(--amber)' : 'var(--amber-ink)' }}>understanding.</span>
            </h1>

            <p style={{
              fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
              color: heroPhoto ? 'rgba(255,255,255,0.88)' : 'var(--text-2)',
              lineHeight: 1.7,
              margin: '0 0 2.5rem',
              maxWidth: 520,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}>
              Explore technical ideas through practical, self-paced courses. Start with Practical Localization Engineering.
              Explore lessons with code, mathematics, and worked examples—free to read, with no login required.
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/courses" className="btn btn-primary btn-lg">Explore courses</Link>
              {!clerkUser && (
                <Link href="/help" className="btn btn-outline btn-lg" style={heroPhoto ? { borderColor: 'rgba(255,255,255,0.6)', color: '#fff' } : undefined}>
                    How learning works
                  </Link>
              )}
              {clerkUser && (
                <Link href="/dashboard" className="btn btn-outline btn-lg" style={heroPhoto ? { borderColor: 'rgba(255,255,255,0.6)', color: '#fff' } : undefined}>
                    My dashboard
                  </Link>
              )}
            </div>
          </div>

          {/* Attribution — bottom-right corner, above overlay */}
          {heroPhoto && photographerUrl && (
            <p style={{
              position: 'absolute', bottom: 8, right: 12,
              margin: 0, fontSize: 10,
              color: 'rgba(255,255,255,0.6)',
              zIndex: 2,
              lineHeight: 1.4,
            }}>
              Photo by{' '}
              <a href={photographerUrl} target="_blank" rel="noopener noreferrer"
                style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'underline' }}>
                {heroPhoto.user.name}
              </a>
              {' '}on{' '}
              <a href={unsplashUrl} target="_blank" rel="noopener noreferrer"
                style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'underline' }}>
                Unsplash
              </a>
            </p>
          )}
        </section>

        {/* Features */}
        <section style={{
          padding: 'clamp(3rem, 8vw, 5rem) 1.5rem',
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '2rem',
            }}>
              {[
                {
                  icon: '</>',
                  title: 'Code in context',
                  body: 'Syntax-highlighted code alongside the explanation, connecting localization concepts with implementation details.',
                  color: 'var(--indigo)',
                },
                {
                  icon: '語',
                  title: 'Multilingual text',
                  body: 'English and Polish passages with language labels, bringing language-specific characters and writing into technical lessons.',
                  color: 'var(--amber)',
                },
                {
                  icon: '∑',
                  title: 'LaTeX math rendering',
                  body: 'Equations and formulas rendered beautifully inline and as display math.',
                  color: 'var(--amber)',
                },
                {
                  icon: '◈',
                  title: 'Structured lessons',
                  body: 'Organized into modules with examples and exercises to work through at your own pace.',
                  color: 'var(--indigo)',
                },
                {
                  icon: '✦',
                  title: 'Open access',
                  body: 'Explore freely available lessons. No account or enrollment needed to start reading.',
                  color: 'var(--amber)',
                },
                {
                  icon: '📈',
                  title: 'Interactive graphs',
                  body: 'Dynamic math graphs embedded directly in lessons to visualise concepts.',
                  color: 'var(--indigo)',
                },
              ].map((f) => (
                <div key={f.title}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: '0.4rem',
                  }}>
                    <div aria-hidden="true" style={{
                      width: 36, height: 36, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: f.color === 'var(--amber)' ? 'var(--amber-muted)' : 'var(--indigo-muted)',
                      borderRadius: 'var(--radius)',
                      fontSize: 16,
                      color: f.color === 'var(--amber)' ? 'var(--amber-ink)' : f.color,
                      fontFamily: 'var(--font-serif)',
                    }}>
                      {f.icon}
                    </div>
                    <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', margin: 0 }}>{f.title}</h2>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0, paddingLeft: 46, lineHeight: 1.6 }}>{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: 'clamp(3rem, 8vw, 5rem) 1.5rem', textAlign: 'center' }}>
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.5rem, 4vw, 2rem)', margin: '0 0 1rem' }}>
              Ready to start?
            </h2>
            <p style={{ color: 'var(--text-2)', margin: '0 0 1.75rem' }}>
              Find a subject to explore and work through the lessons at your own pace. No login required.
            </p>
            <Link href="/courses" className="btn btn-primary btn-lg">Explore courses</Link>
          </div>
        </section>
      </main>
    </>
  )
}
