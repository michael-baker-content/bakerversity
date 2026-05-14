import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Course, User } from '@/lib/types'

export default async function AdminCoursesPage() {
  const clerkUser = await currentUser()
  if (!clerkUser) redirect('/sign-in')

  const supabase = createServiceClient()

  const { data: user } = await supabase
    .from('users')
    .select('id, role')
    .eq('clerk_id', clerkUser.id)
    .single<User>()

  if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
    redirect('/dashboard')
  }

  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .eq('instructor_id', user.id)
    .order('created_at', { ascending: false })
    .returns<Course[]>()

  return (
    <main className="page" style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Link href="/dashboard" style={{ fontSize: 14, color: 'var(--text-3)', textDecoration: 'none' }}>← Dashboard</Link>
          <h1 style={{ margin: '0.25rem 0 0' }}>My courses</h1>
        </div>
        <Link href="/admin/courses/new">
          <button className="btn btn-primary">+ New course</button>
        </Link>
      </div>

      {!courses?.length ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-3)' }}>
          <p style={{ marginBottom: '1rem' }}>No courses yet.</p>
          <Link href="/admin/courses/new">
            <button className="btn btn-outline">Create your first course</button>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {courses.map((course) => (
            <div key={course.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <strong style={{ fontSize: 15 }}>{course.title}</strong>
                  <span className={`badge ${course.is_published ? 'badge-success' : 'badge-neutral'}`}>
                    {course.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  /courses/{course.slug} · {course.price_cents === 0 ? 'Free' : `$${(course.price_cents / 100).toFixed(2)}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
                <Link href={`/admin/courses/${course.slug}`}>
                  <button className="btn btn-ghost btn-sm">Edit</button>
                </Link>
                <Link href={`/admin/grading?course=${course.id}`}>
                  <button className="btn btn-ghost btn-sm">Responses</button>
                </Link>
                <Link href={`/courses/${course.slug}`} target="_blank">
                  <button className="btn btn-outline btn-sm">Preview ↗</button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
