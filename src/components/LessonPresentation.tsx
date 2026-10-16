import Link from 'next/link'

export function LessonHeading({ title, introduction, moduleTitle, index, total }: {
  title: string; introduction?: string | null; moduleTitle?: string; index: number; total: number
}) {
  return <header className="lesson-hero">
    <div className="lesson-hero-meta">
      <span className="lesson-eyebrow">{moduleTitle ?? 'Course lesson'}</span>
      {index >= 0 && total > 0 && <span className="lesson-position">Lesson {index + 1} of {total}</span>}
    </div>
    <h1>{title}</h1>
    {introduction && <p className="lesson-introduction">{introduction}</p>}
  </header>
}

export function LessonPager({ previous, next, courseHref }: {
  previous: { href: string; title: string } | null; next: { href: string; title: string } | null; courseHref: string
}) {
  return <nav className="lesson-pager" aria-label="Lesson navigation">
    {previous ? <Link href={previous.href} className="lesson-page-card"><span className="lesson-eyebrow">← Previous</span><strong>{previous.title}</strong></Link> : <div />}
    <Link href={next?.href ?? courseHref} className="lesson-page-card lesson-page-card-next"><span className="lesson-eyebrow">{next ? 'Up next →' : 'Course overview →'}</span><strong>{next?.title ?? 'Back to your course'}</strong></Link>
  </nav>
}
