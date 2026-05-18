import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import PublishToggle from './PublishToggle'
import EnrollSelfButton from '@/components/EnrollSelfButton'
import CourseSettings from '@/components/CourseSettings'
import CourseDetailLayout from './CourseDetailLayout'

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
    .select('id, title, slug, description, is_published, price_cents, thumbnail_url, intro_description, conclusion_description, editor_tools')
    .eq('slug', slug)
    .single()

  if (!course) notFound()

  const [
    { data: modules },
    { data: coursePages },
    { data: allLessons },
    { data: selfEnrollment },
    { count: enrollmentCount },
  ] = await Promise.all([
    supabase.from('modules')
      .select('id, title, description, slug, position')
      .eq('course_id', course.id)
      .order('position', { ascending: true }),
    supabase.from('course_pages')
      .select('id, title, slug, page_type, module_id, is_published, position, introduction')
      .eq('course_id', course.id)
      .order('position', { ascending: true }),
    supabase.from('lessons')
      .select('id, title, slug, position, is_published, module_id')
      .eq('course_id', course.id)
      .order('position', { ascending: true }),
    supabase.from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', course.id)
      .maybeSingle(),
    supabase.from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', course.id),
  ])

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Course title and meta */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ margin: '0 0 0.25rem', fontFamily: 'var(--font-serif)' }}>{course.title}</h1>
        <div style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
          <span>/courses/{course.slug}</span>
          <span className="meta-wrap"> · {course.price_cents === 0 ? 'Free' : `$${(course.price_cents / 100).toFixed(2)}`}
          {enrollmentCount !== null && ` · ${enrollmentCount} enrolled`}</span>
        </div>
      </div>

      {/* Course management */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ margin: '0 0 0.25rem', fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)' }}>
          Course management
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 0.875rem' }}>
          Publish, configure settings, review student responses, and preview the course as a student.
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
            thumbnailUrl={course.thumbnail_url ?? null}
            introDescription={course.intro_description ?? null}
            conclusionDescription={course.conclusion_description ?? null}
            editorTools={course.editor_tools ?? []}
          />
          <Link href={`/admin/grading?course=${course.id}`}>
            <button className="btn btn-ghost btn-sm">Responses</button>
          </Link>
          <Link href={`/courses/${course.slug}`} target="_blank">
            <button className="btn btn-ghost btn-sm">Preview ↗</button>
          </Link>
        </div>
      </div>

      {/* Course content */}
      <div>
        <h2 style={{ margin: '0 0 0.25rem', fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)' }}>
          Course content
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 1.25rem' }}>
          Introduction and conclusion pages appear in the sidebar before and after the modules. Modules contain the lessons students work through in sequence.
        </p>
        <CourseDetailLayout
          course={{
            id: course.id,
            slug: course.slug,
            intro_description: course.intro_description ?? null,
            conclusion_description: course.conclusion_description ?? null,
          }}
          modules={modules ?? []}
          pages={coursePages ?? []}
          lessons={allLessons ?? []}
        />
      </div>
    </main>
  )
}
