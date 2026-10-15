import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import type { Enrollment, Course } from '@/lib/types'
import Link from 'next/link'
import SiteNav from '@/components/SiteNav'

interface EnrollmentWithCourse extends Enrollment {
  courses: Course
}

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const clerkUser = await currentUser()
  if (!clerkUser) return null

  const supabase = createServiceClient()

  const { data: user } = await supabase
    .from('users')
    .select('id, full_name, role')
    .eq('clerk_id', clerkUser.id)
    .single()

  const isInstructor = user?.role === 'instructor' || user?.role === 'admin'
  if (!user) return <main className="page"><p>Your account is still being synchronized. Please try again shortly.</p></main>

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('*, courses(*)')
    .eq('user_id', user?.id)
    .returns<EnrollmentWithCourse[]>()

  const { data: authoredCourses } = isInstructor ? await supabase
    .from('courses')
    .select('*')
    .eq('instructor_id', user.id)
    .order('created_at', { ascending: false })
    .returns<Course[]>() : { data: null }

  return (
    <>
      <SiteNav active="dashboard" />
      <main className="page">
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ margin: '0 0 0.25rem' }}>
            Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
          </h1>
          <p style={{ color: 'var(--text-2)', margin: 0 }}>
            {isInstructor ? 'Instructor dashboard' : 'Student dashboard'}
          </p>
        </div>

        {/* Instructor section */}
        {isInstructor && (
          <section style={{ marginBottom: '2.5rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', margin: 0 }}>
                My courses
              </h2>
              <Link href="/admin/courses/new">
                <button className="btn btn-primary btn-sm">+ New course</button>
              </Link>
            </div>

            {!authoredCourses?.length ? (
              <div style={{
                padding: '2rem',
                border: '1.5px dashed var(--border)',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center',
              }}>
                <p style={{ color: 'var(--text-2)', margin: '0 0 1rem', fontSize: 14 }}>No courses yet.</p>
                <Link href="/admin/courses/new">
                  <button className="btn btn-outline btn-sm">Create your first course</button>
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {authoredCourses.map((course) => (
                  <div key={course.id} className="card" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 500, fontSize: 15 }}>{course.title}</span>
                        <span className={`badge ${course.is_published ? 'badge-success' : 'badge-neutral'}`}>
                          {course.is_published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        {course.price_cents === 0 ? 'Free' : `$${(course.price_cents / 100).toFixed(2)}`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link href={`/admin/courses/${course.slug}`}>
                        <button className="btn btn-ghost btn-sm">Edit</button>
                      </Link>
                      <Link href={`/courses/${course.slug}`} target="_blank">
                        <button className="btn btn-ghost btn-sm">View ↗</button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', fontSize: 13 }}>
              <Link href="/admin/courses" style={{ color: 'var(--indigo)' }}>All courses →</Link>
              <Link href="/admin/grading" style={{ color: 'var(--indigo)' }}>Student responses →</Link>
            </div>
          </section>
        )}

        {/* Enrolled courses */}
        <section>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', margin: '0 0 1rem' }}>
            {isInstructor ? 'Enrolled courses' : 'My courses'}
          </h2>

          {!enrollments?.length ? (
            <div style={{
              padding: '2rem',
              border: '1.5px dashed var(--border)',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
            }}>
              <p style={{ color: 'var(--text-2)', margin: '0 0 1rem', fontSize: 14 }}>
                Not enrolled in any courses yet.
              </p>
              <Link href="/courses">
                <button className="btn btn-outline btn-sm">Browse courses</button>
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {enrollments.map((enrollment) => (
                <div key={enrollment.id} className="card" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}>
                  <div>
                    <span style={{ fontWeight: 500, fontSize: 15 }}>{enrollment.courses.title}</span>
                    {enrollment.completed_at && (
                      <span className="badge badge-success" style={{ marginLeft: 8 }}>✓ Completed</span>
                    )}
                  </div>
                  <Link href={`/courses/${enrollment.courses.slug}`}>
                    <button className="btn btn-secondary btn-sm">Continue →</button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  )
}
