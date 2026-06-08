import SiteNav from '@/components/SiteNav'
import Link from 'next/link'

export const metadata = {
  title: 'About — Bakerversity',
  description: 'About Bakerversity, the instructor behind it, and related projects.',
}

export default function AboutPage() {
  return (
    <>
      <SiteNav />
      <main className="site-shell">

        {/* Hero */}
        <section style={{
          padding: 'clamp(3rem, 8vw, 5rem) 1.5rem',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
        }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              background: 'var(--amber-muted)',
              borderRadius: 'var(--radius-full)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--amber-hover)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '1.5rem',
            }}>
              ✦ About
            </div>
            <h1 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              lineHeight: 1.15,
              margin: '0 0 1.25rem',
              color: 'var(--text)',
            }}>
              A Learning Platform for Everyone
            </h1>
            <p style={{
              fontSize: 'clamp(1rem, 2.5vw, 1.15rem)',
              color: 'var(--text-2)',
              lineHeight: 1.75,
              margin: 0,
            }}>
              If you're looking to learn more about subjects like algebra and programming, you've come to the right place.
              Bakerversity offers structured coursework with interactive lessons, exercises, and certificates.
            </p>
          </div>
        </section>

        {/* About the project */}
        <section style={{
          padding: 'clamp(3rem, 8vw, 5rem) 1.5rem',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(1.4rem, 3vw, 1.9rem)',
              margin: '0 0 1.25rem',
            }}>
              About Bakerversity
            </h2>
            <div style={{ fontSize: 16, color: 'var(--text-2)', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ margin: 0 }}>
                Not long ago, I had the idea of assembling course materials for algebra students.
                As I studied popular online learning platforms, I found that they generally do not offer support for LaTeX,
                which is a must when presenting algebra formulas on the web.
                Rather than try to build around existing platforms, I decided to create my own.
              </p>
              <p style={{ margin: 0 }}>
                The core of this platform is its editorial interface.
                It's built on <a href="https://tiptap.dev/" target="_blank">Tiptap</a>, a popular open source editor framework.
                Thanks to Tiptap and Next.js, I've been able to add features to the editor that make it easier to teach technical topics.
                I've also added support to properly highlight code samples, which is a must for the Python class I'm developing here.
              </p>
              <p style={{ margin: 0 }}>
                I've completed most of the work for the first stage — finalizing the basic structure and functions of the platform.
                The next phase is building out course content, activating a certificate system, and allowing in-platform payments.
              </p>
            </div>
          </div>
        </section>

        {/* About the instructor */}
        <section style={{
          padding: 'clamp(3rem, 8vw, 5rem) 1.5rem',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(1.4rem, 3vw, 1.9rem)',
              margin: '0 0 1.25rem',
            }}>
              About Michael Baker
            </h2>
            <div style={{ fontSize: 16, color: 'var(--text-2)', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ margin: 0 }}>
                I'm a veteran content producer and currently a web development student living in the SF Bay Area.
                I built this site to serve as the hub for my instructional writing projects.
              </p>
              <p style={{ margin: 0 }}>
                If you like what you see, I hope you'll check out some of my other projects linked below.
              </p>
            </div>
          </div>
        </section>

        {/* Other projects */}
        <section style={{
          padding: 'clamp(3rem, 8vw, 5rem) 1.5rem',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(1.4rem, 3vw, 1.9rem)',
              margin: '0 0 0.5rem',
            }}>
              Other projects
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-3)', margin: '0 0 2rem' }}>
              A few other things worth exploring.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { name: 'BakerLinks', url: 'https://bakerlinks.com', description: 'My link-in-bio platform.' },
                { name: `Mike's List`, url: 'https://mikeslist.xyz', description: 'My SF Bay area events calendar.' },
                { name: 'My Portfolio', url: 'https://michaelbaker.vercel.app', description: 'Case studies about my current projects.' },
              ].map((project) => (
                <a
                  key={project.name}
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="about-project-card"
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    padding: '1rem 1.25rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--surface)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)', marginBottom: 2 }}>{project.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{project.description}</div>
                    </div>
                    <span style={{ color: 'var(--text-3)', flexShrink: 0, fontSize: 16 }}>↗</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: 'clamp(3rem, 8vw, 5rem) 1.5rem', textAlign: 'center' }}>
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', margin: '0 0 1rem' }}>
              Ready to start learning?
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
