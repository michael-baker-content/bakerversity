import { publicMetadata } from '@/lib/publicMetadata'
import SiteNav from '@/components/SiteNav'
import Link from 'next/link'

export const metadata = publicMetadata('About', 'Technical lessons with room for code, mathematics, and practical examples. Learn about Bakerversity, Practical Localization Engineering, and Michael Baker.', '/about')

export default function AboutPage() {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <SiteNav active="about" />
      <main id="main-content" tabIndex={-1} className="site-shell">

        {/* Hero */}
        <section style={{
          padding: 'clamp(3rem, 8vw, 5rem) 1.5rem',
          borderBottom: '1px solid var(--border)',
          backgroundColor: '#18231b',
          backgroundImage: 'linear-gradient(rgba(12, 22, 15, 0.72), rgba(12, 22, 15, 0.72)), url(https://images.unsplash.com/photo-1583264636244-65f8345ad308?auto=format&fit=crop&w=2000&q=85)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
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
              color: 'var(--amber-ink)',
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
              color: '#fff',
            }}>
              Technical ideas deserve room to unfold.
            </h1>
            <p style={{
              fontSize: 'clamp(1rem, 2.5vw, 1.15rem)',
              color: '#f3f4ee',
              lineHeight: 1.75,
              margin: 0,
            }}>
              Bakerversity is Michael Baker’s independent learning platform, built to bring explanations, code, mathematics, and practice together in the same lesson.
              Its first and currently only course is Practical Localization Engineering, free to read with no login required.
            </p>
            <p style={{ fontSize: 12, color: '#f3f4ee', margin: '2rem 0 0' }}>
              Photo by{' '}
              <a href="https://unsplash.com/@christina_winter?utm_source=bakerversity&utm_medium=referral" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>Christina Winter</a>
              {' '}on{' '}
              <a href="https://unsplash.com/photos/green-fruit-on-brown-tree-branch-BZ3zysdFn9A?utm_source=bakerversity&utm_medium=referral" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>Unsplash</a>
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
                I started Bakerversity while exploring how to create an algebra course. I wanted mathematical notation to feel
                at home in a lesson, with the same care given to the writing around it. That became a broader goal:
                give course authors room to explain a subject in the forms it needs.
              </p>
              <p style={{ margin: 0 }}>
                A technical lesson may need a code sample, a formula, a diagram, and a worked example before an idea clicks.
                Bakerversity brings those pieces into the authoring experience, alongside structured explanations and practice questions.
                The lesson can follow the subject, without forcing every explanation into the same format.
              </p>
              <p style={{ margin: 0 }}>
                Practical Localization Engineering puts that approach to work. Making software work across languages connects
                human choices with technical details. Code examples and mathematical notation belong alongside the discussion,
                where readers can connect an implementation to the reasoning behind it.
              </p>
              <p style={{ margin: 0 }}>
                I’m currently building out course content and refining the learning experience. Before a commercial launch, I plan to develop a more complete progress-tracking system for enrolled students. For now, the focus is on useful, freely accessible lessons.
              </p>
            </div>
          </div>
        </section>

        {/* Authoring approach */}
        <section style={{ padding: 'clamp(3rem, 8vw, 5rem) 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', margin: '0 0 1.25rem' }}>
              Built for the details that make a lesson useful
            </h2>
            <dl style={{ margin: 0, display: 'grid', gap: '1.5rem', color: 'var(--text-2)', lineHeight: 1.8 }}>
              {[
                { title: 'Explain with code and mathematics', text: 'Use syntax-highlighted code, inline and display LaTeX, and mathematical graphs to connect an idea with a worked example.' },
                { title: 'Give the writing structure', text: 'Bring objectives, notes, tables, images, and supporting resources into the lesson. Language labels support passages in English and Polish.' },
                { title: 'Make room for practice and revision', text: 'Include practice quizzes and refine lessons as drafts before publishing updates. Good course content develops through revision.' },
              ].map((feature) => (
                <div key={feature.title}>
                  <dt style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{feature.title}</dt>
                  <dd style={{ margin: 0 }}>{feature.text}</dd>
                </div>
              ))}
            </dl>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', margin: '2.5rem 0 1rem' }}>
              Where this approach can go
            </h3>
            <p style={{ color: 'var(--text-2)', lineHeight: 1.8, margin: 0 }}>
              Accessibility engineering, search evaluation, and software reliability all connect implementation with interpretation:
              understanding a contrast calculation, measuring whether search results are useful, or explaining what a latency percentile means.
              These are examples of subjects this toolset could support, not additional courses currently offered.
            </p>
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
                { name: 'sketchlet', url: 'https://sketchlet.app', description: 'A daily drawing app I’m working on.' },
                { name: 'Baker Parks', url: 'https://bakerparks.vercel.app', description: 'My public works tool for SF Bay Area parkgoers.' },
                { name: 'BakerLinks', url: 'https://bakerlinks.com', description: 'My link-in-bio platform.' },
                { name: 'My Creative Portfolio', url: 'https://michaelbaker.vercel.app', description: 'Case studies about my current projects.' },
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
              Explore Practical Localization Engineering. Free to read, with no login required.
            </p>
            <Link href="/courses" className="btn btn-primary btn-lg">Explore the course</Link>
          </div>
        </section>

      </main>
    </>
  )
}
