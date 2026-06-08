import Link from 'next/link'
import { currentUser } from '@clerk/nextjs/server'
import SiteNav from '@/components/SiteNav'

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
      <SiteNav />
      <main className="site-shell">
        {/* Hero */}
        <section style={{
          padding: 'clamp(4rem, 10vw, 8rem) 1.5rem',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          // Fall back to plain bg if no photo
          background: heroPhoto ? 'none' : 'var(--bg)',
        }}>
          {/* Background image */}
          {heroPhoto && (
            <>
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `url(${heroPhoto.urls.regular})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                zIndex: 0,
              }} />
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
              color: heroPhoto ? 'rgba(255,255,255,0.9)' : 'var(--amber-hover)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '1.5rem',
            }}>
              ✦ Now enrolling
            </div>

            <h1 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(2.5rem, 6vw, 4rem)',
              lineHeight: 1.1,
              margin: '0 0 1.25rem',
              color: heroPhoto ? '#fff' : 'var(--text)',
              textShadow: heroPhoto ? '0 2px 12px rgba(0,0,0,0.4)' : 'none',
            }}>
              Learn to think
              <br />
              <span style={{ color: heroPhoto ? 'var(--amber)' : 'var(--amber)' }}>mathematically.</span>
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
              Structured courses in algebra and programming with interactive lessons,
              exercises, and certificates.
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/courses">
                <button className="btn btn-primary btn-lg">Browse courses</button>
              </Link>
              {!clerkUser && (
                <Link href="/sign-up">
                  <button className="btn btn-outline btn-lg" style={heroPhoto ? { borderColor: 'rgba(255,255,255,0.6)', color: '#fff' } : undefined}>
                    Create account
                  </button>
                </Link>
              )}
              {clerkUser && (
                <Link href="/dashboard">
                  <button className="btn btn-outline btn-lg" style={heroPhoto ? { borderColor: 'rgba(255,255,255,0.6)', color: '#fff' } : undefined}>
                    My dashboard
                  </button>
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
                  icon: '∑',
                  title: 'LaTeX math rendering',
                  body: 'Equations and formulas rendered beautifully inline and as display math.',
                  color: 'var(--amber)',
                },
                {
                  icon: '◈',
                  title: 'Structured lessons',
                  body: 'Organized into modules with quizzes, exercises, and progress tracking.',
                  color: 'var(--indigo)',
                },
                {
                  icon: '✦',
                  title: 'Certificates',
                  body: 'Earn a certificate when you complete a course and pass its assessments.',
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
                    <div style={{
                      width: 36, height: 36, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: f.color === 'var(--amber)' ? 'var(--amber-muted)' : 'var(--indigo-muted)',
                      borderRadius: 'var(--radius)',
                      fontSize: 16,
                      color: f.color,
                      fontFamily: 'var(--font-serif)',
                    }}>
                      {f.icon}
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', margin: 0 }}>{f.title}</h3>
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
              Browse the course catalogue and enroll for free.
            </p>
            <Link href="/courses">
              <button className="btn btn-primary btn-lg">See all courses</button>
            </Link>
          </div>
        </section>
      </main>
    </>
  )
}
