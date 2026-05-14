import { createServerClient } from '@/lib/supabase'
import Link from 'next/link'
import type { Course } from '@/lib/types'
import SiteNav from '@/components/SiteNav'

export const metadata = { title: 'Courses' }

export default async function CoursesPage() {
  const supabase = createServerClient()

  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .returns<Course[]>()

  return (
    <>
      <SiteNav active="courses" />
      <main className="page">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: '0 0 0.4rem' }}>Courses</h1>
          <p style={{ color: 'var(--text-2)', margin: 0 }}>
            {courses?.length ?? 0} course{courses?.length !== 1 ? 's' : ''} available
          </p>
        </div>

        {!courses?.length ? (
          <div style={{
            textAlign: 'center',
            padding: '4rem 0',
            color: 'var(--text-3)',
            border: '1.5px dashed var(--border)',
            borderRadius: 'var(--radius-lg)',
          }}>
            No courses published yet. Check back soon.
          </div>
        ) : (
          <div className="course-grid">
            {courses.map((course) => (
              <Link key={course.id} href={`/courses/${course.slug}`} style={{ textDecoration: 'none' }}>
                <div className="card card-hover" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {/* Thumbnail or gradient fallback */}
                  {course.thumbnail_url ? (
                    <div style={{
                      height: 160, margin: '-1.25rem -1.25rem 0',
                      borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
                      overflow: 'hidden',
                    }}>
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  ) : (
                    <div style={{
                      height: 160, margin: '-1.25rem -1.25rem 0',
                      borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
                      background: 'linear-gradient(135deg, var(--amber), var(--indigo))',
                    }} />
                  )}

                  <h2 style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.2rem',
                    margin: 0,
                    color: 'var(--text)',
                  }}>
                    {course.title}
                  </h2>

                  {course.description && (
                    <p style={{
                      fontSize: 14,
                      color: 'var(--text-2)',
                      margin: 0,
                      lineHeight: 1.55,
                      flex: 1,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    } as React.CSSProperties}>
                      {course.description}
                    </p>
                  )}

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 'auto',
                    paddingTop: '0.5rem',
                    borderTop: '1px solid var(--border)',
                  }}>
                    <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Instructor</span>
                    <span style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: course.price_cents === 0 ? 'var(--success)' : 'var(--text)',
                    }}>
                      {course.price_cents === 0 ? 'Free' : `$${(course.price_cents / 100).toFixed(2)}`}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
