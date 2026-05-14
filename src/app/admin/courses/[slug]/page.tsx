import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import PublishToggle from './PublishToggle'
import EnrollSelfButton from '@/components/EnrollSelfButton'
import CourseSettings from '@/components/CourseSettings'
import CourseProgressLoader from '@/components/CourseProgressLoader'
import DeleteButton from '@/components/DeleteButton'

const supabase = createServiceClient()

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const { data } = await supabase.from('courses').select('title').eq('slug', slug).single()
  return { title: data ? `${data.title} — Admin | Bakerversity` : 'Course — Admin' }
}

export default async function AdminCourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const { data: user } = await supabase
    .from('users').select('id, role').eq('clerk_id', clerkId).single()
  if (!user || (user.role !== 'admin' && user.role !== 'instructor')) redirect('/dashboard')

  const { data: course } = await supabase
    .from('courses')
    .select('id, title, slug, description, is_published, price_cents')
    .eq('slug', slug)
    .single()

  if (!course) notFound()

  // Modules + lessons
  const { data: modules } = await supabase
    .from('modules')
    .select('id, title, description, position')
    .eq('course_id', course.id)
    .order('position', { ascending: true })

  const lessonsByModule: Record<string, {
    id: string; title: string; slug: string | null; position: number; is_published: boolean; lesson_type: string; youtube_url: string | null; slides_url: string | null
  }[]> = {}

  if (modules?.length) {
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id, title, slug, position, is_published, lesson_type, module_id, youtube_url, slides_url')
      .in('module_id', modules.map((m) => m.id))
      .order('position', { ascending: true })

    for (const lesson of lessons ?? []) {
      if (!lessonsByModule[lesson.module_id]) lessonsByModule[lesson.module_id] = []
      lessonsByModule[lesson.module_id].push(lesson)
    }
  }

  // Course pages
  const { data: coursePages } = await supabase
    .from('course_pages')
    .select('id, title, position, is_published')
    .eq('course_id', course.id)
    .order('position', { ascending: true })

  // Self-enrollment status
  const { data: selfEnrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', course.id)
    .maybeSingle()

  // Enrollment count
  const { count: enrollmentCount } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', course.id)

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Course header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.25rem', fontFamily: 'var(--font-serif)' }}>{course.title}</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 1rem' }}>
          /courses/{course.slug} · {course.price_cents === 0 ? 'Free' : `$${(course.price_cents / 100).toFixed(2)}`}
          {enrollmentCount !== null && ` · ${enrollmentCount} enrolled`}
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <PublishToggle courseId={course.id} isPublished={course.is_published} />
          <EnrollSelfButton courseId={course.id} isEnrolled={!!selfEnrollment} />
          <CourseSettings
            courseId={course.id}
            title={course.title}
            description={course.description ?? ''}
            slug={course.slug}
            priceCents={course.price_cents ?? 0}
          />
          <Link href={`/admin/grading?course=${course.id}`}>
            <button className="btn btn-ghost btn-sm">Responses</button>
          </Link>
          <Link href={`/courses/${course.slug}`} target="_blank">
            <button className="btn btn-outline btn-sm">Preview ↗</button>
          </Link>
        </div>
      </div>

      {/* Progress (only visible if self-enrolled) */}
      {selfEnrollment && (
        <CourseProgressLoader courseId={course.id} />
      )}

      {/* Course pages section */}
      <section style={{ marginBottom: '2rem' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: '0.75rem',
        }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Course pages</h2>
          <Link href={`/admin/courses/${course.slug}/pages/new`}>
            <button className="btn btn-outline btn-sm">+ Add page</button>
          </Link>
        </div>

        {!coursePages?.length ? (
          <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No pages yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {coursePages.map((page) => (
              <div
                key={page.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                }}
              >
                <span style={{ fontSize: 16 }}>📄</span>
                <span style={{ flex: 1, fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>
                  {page.title}
                </span>
                {!page.is_published && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px',
                    borderRadius: 'var(--radius-full)', background: 'var(--surface-2)',
                    color: 'var(--text-3)',
                  }}>
                    Draft
                  </span>
                )}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {page.slug && (
                    <Link href={`/courses/${course.slug}/pages/${page.slug}`} target="_blank">
                      <button className="btn btn-ghost btn-sm">Preview ↗</button>
                    </Link>
                  )}
                  <Link href={`/admin/courses/${course.slug}/pages/${page.id}`}>
                    <button className="btn btn-ghost btn-sm">Edit</button>
                  </Link>
                  <DeleteButton
                    url={`/api/admin/courses/${course.id}/pages/${page.id}`}
                    confirm={`Delete "${page.title}"? This cannot be undone.`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modules + lessons */}
      <section>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: '0.75rem',
        }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Modules</h2>
          <Link href={`/admin/courses/${course.slug}/modules/new`}>
            <button className="btn btn-outline btn-sm">+ Add module</button>
          </Link>
        </div>

        {!modules?.length ? (
          <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No modules yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {modules.map((mod) => {
              const lessons = lessonsByModule[mod.id] ?? []
              return (
                <div
                  key={mod.id}
                  style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                  }}
                >
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', padding: '12px 16px',
                    borderBottom: lessons.length ? '1px solid var(--border)' : 'none',
                    background: 'var(--surface-2)',
                  }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{mod.title}</span>
                      {mod.description && (
                        <span style={{ fontSize: 12, color: 'var(--text-2)', marginLeft: 8 }}>
                          {mod.description}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Link href={`/admin/courses/${course.slug}/modules/${mod.id}`}>
                        <button className="btn btn-ghost btn-sm">Edit</button>
                      </Link>
                      <Link href={`/admin/courses/${course.slug}/lessons/new?module=${mod.id}`}>
                        <button className="btn btn-ghost btn-sm">+ Lesson</button>
                      </Link>
                      <DeleteButton
                        url={`/api/admin/courses/${course.id}/modules/${mod.id}`}
                        confirm={`Delete module "${mod.title}"? Its lessons will become unassigned.`}
                      />
                    </div>
                  </div>

                  {lessons.length > 0 && (
                    <div>
                      {lessons.map((lesson, i) => (
                        <div
                          key={lesson.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 16px',
                            borderBottom: i < lessons.length - 1 ? '1px solid var(--border)' : 'none',
                          }}
                        >
                          <span style={{ fontSize: 14, width: 20, textAlign: 'center', color: 'var(--text-3)', flexShrink: 0 }}>
                            {lesson.lesson_type === 'quiz' ? '❓'
                              : lesson.lesson_type === 'video' ? '▶'
                              : lesson.youtube_url ? '▶'
                              : lesson.slides_url ? '📎'
                              : '📝'}
                          </span>
                          <span style={{ flex: 1, fontSize: 14, color: 'var(--text)', fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {lesson.title}
                          </span>
                          {!lesson.is_published && (
                            <span style={{
                              fontSize: 11, fontWeight: 600, padding: '2px 8px',
                              borderRadius: 'var(--radius-full)', background: 'var(--surface-2)',
                              color: 'var(--text-3)', flexShrink: 0,
                            }}>
                              Draft
                            </span>
                          )}
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            {lesson.slug && (
                              <Link href={`/courses/${course.slug}/lessons/${lesson.slug}`} target="_blank">
                                <button className="btn btn-ghost btn-sm">Preview ↗</button>
                              </Link>
                            )}
                            <Link href={`/admin/courses/${course.slug}/lessons/${lesson.id}`}>
                              <button className="btn btn-ghost btn-sm">Edit</button>
                            </Link>
                            <DeleteButton
                              url={`/api/admin/courses/${course.id}/lessons/${lesson.id}`}
                              confirm={`Delete "${lesson.title}"? This cannot be undone.`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
