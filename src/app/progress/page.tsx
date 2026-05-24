import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import SiteNav from '@/components/SiteNav'

export const metadata: Metadata = { title: 'My Progress · Bakerversity' }

const supabase = createServiceClient()

interface ModuleBreakdown {
  id: string
  title: string
  lessons: { total: number; completed: number }
  assessments: { total: number; passed: number }
  pct: number   // combined: (lessons completed + assessments passed) / (lessons + graded assessments)
}

interface CourseProgress {
  course: { id: string; title: string; slug: string; description: string }
  enrolled_at: string
  progress: {
    lessons: { completed: number; total: number }
    assessments: { passed: number; total: number }
    pct: number
  }
  modules: ModuleBreakdown[]
  certificate: { issued_at: string; certificate_url: string | null } | null
}

async function getProgress(clerkId: string): Promise<CourseProgress[]> {
  const { data: user } = await supabase
    .from('users').select('id').eq('clerk_id', clerkId).single()
  if (!user) return []

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id, enrolled_at, courses(id, title, slug, description)')
    .eq('user_id', user.id)

  if (!enrollments?.length) return []

  const courseIds = enrollments.map((e) => e.course_id)

  const [
    { data: allLessons },
    { data: allLessonCompletions },
    { data: allModules },
    { data: allAssessments },
    { data: allAssessmentCompletions },
    { data: certificates },
  ] = await Promise.all([
    supabase.from('lessons')
      .select('id, course_id, module_id')
      .in('course_id', courseIds)
      .eq('is_published', true),
    supabase.from('lesson_completions')
      .select('lesson_id, course_id')
      .eq('user_id', user.id)
      .in('course_id', courseIds),
    supabase.from('modules')
      .select('id, title, course_id, position')
      .in('course_id', courseIds)
      .order('position'),
    supabase.from('assessments')
      .select('id, course_id, module_id, is_graded')
      .in('course_id', courseIds)
      .eq('is_published', true)
      .eq('is_graded', true),   // only graded assessments count toward progress
    supabase.from('assessment_completions')
      .select('assessment_id, course_id, passed, score')
      .eq('user_id', user.id)
      .in('course_id', courseIds),
    supabase.from('certificates')
      .select('course_id, issued_at, certificate_url')
      .eq('user_id', user.id)
      .in('course_id', courseIds),
  ])

  // Build lookup maps
  const completedLessonsByCourse = new Map<string, Set<string>>()
  for (const c of allLessonCompletions ?? []) {
    if (!completedLessonsByCourse.has(c.course_id)) completedLessonsByCourse.set(c.course_id, new Set())
    completedLessonsByCourse.get(c.course_id)!.add(c.lesson_id)
  }

  const passedAssessmentsByCourse = new Map<string, Set<string>>()
  for (const c of allAssessmentCompletions ?? []) {
    if (!c.passed) continue
    if (!passedAssessmentsByCourse.has(c.course_id)) passedAssessmentsByCourse.set(c.course_id, new Set())
    passedAssessmentsByCourse.get(c.course_id)!.add(c.assessment_id)
  }

  const lessonsByCourse = new Map<string, typeof allLessons>()
  for (const l of allLessons ?? []) {
    if (!lessonsByCourse.has(l.course_id)) lessonsByCourse.set(l.course_id, [])
    lessonsByCourse.get(l.course_id)!.push(l)
  }

  const assessmentsByCourse = new Map<string, typeof allAssessments>()
  for (const a of allAssessments ?? []) {
    if (!assessmentsByCourse.has(a.course_id)) assessmentsByCourse.set(a.course_id, [])
    assessmentsByCourse.get(a.course_id)!.push(a)
  }

  const modulesByCourse = new Map<string, typeof allModules>()
  for (const m of allModules ?? []) {
    if (!modulesByCourse.has(m.course_id)) modulesByCourse.set(m.course_id, [])
    modulesByCourse.get(m.course_id)!.push(m)
  }

  const certByCourse = new Map((certificates ?? []).map((c) => [c.course_id, c]))

  return enrollments.map((enrollment) => {
    const course = enrollment.courses as unknown as CourseProgress['course']
    const courseId = course.id

    const lessons = lessonsByCourse.get(courseId) ?? []
    const completedLessons = completedLessonsByCourse.get(courseId) ?? new Set()
    const assessments = assessmentsByCourse.get(courseId) ?? []
    const passedAssessments = passedAssessmentsByCourse.get(courseId) ?? new Set()
    const modules = modulesByCourse.get(courseId) ?? []

    const completedLessonCount = lessons.filter((l) => completedLessons.has(l.id)).length
    const passedAssessmentCount = assessments.filter((a) => passedAssessments.has(a.id)).length

    const totalItems = lessons.length + assessments.length
    const completedItems = completedLessonCount + passedAssessmentCount
    const pct = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100)

    const moduleBreakdown: ModuleBreakdown[] = modules.map((mod) => {
      const modLessons = lessons.filter((l) => l.module_id === mod.id)
      const modAssessments = assessments.filter((a) => a.module_id === mod.id)
      const modCompletedLessons = modLessons.filter((l) => completedLessons.has(l.id)).length
      const modPassedAssessments = modAssessments.filter((a) => passedAssessments.has(a.id)).length
      const modTotal = modLessons.length + modAssessments.length
      const modCompleted = modCompletedLessons + modPassedAssessments

      return {
        id: mod.id,
        title: mod.title,
        lessons: { total: modLessons.length, completed: modCompletedLessons },
        assessments: { total: modAssessments.length, passed: modPassedAssessments },
        pct: modTotal === 0 ? 0 : Math.round((modCompleted / modTotal) * 100),
      }
    }).filter((m) => m.lessons.total + m.assessments.total > 0)

    return {
      course,
      enrolled_at: enrollment.enrolled_at,
      progress: {
        lessons: { completed: completedLessonCount, total: lessons.length },
        assessments: { passed: passedAssessmentCount, total: assessments.length },
        pct,
      },
      modules: moduleBreakdown,
      certificate: certByCourse.get(courseId) ?? null,
    }
  })
}

export default async function ProgressPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const courses = await getProgress(clerkId)

  return (
    <>
      <SiteNav />
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ margin: '0 0 0.5rem', fontFamily: 'var(--font-serif)' }}>My Progress</h1>
          <p style={{ color: 'var(--text-2)', margin: 0 }}>
            Track your progress across all enrolled courses.
          </p>
        </div>

        {courses.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '3rem 2rem',
            background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
          }}>
            <p style={{ fontSize: 18, color: 'var(--text-2)', marginBottom: '1rem' }}>
              You haven't enrolled in any courses yet.
            </p>
            <Link href="/courses">
              <button className="btn btn-primary">Browse courses</button>
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {courses.map(({ course, progress, modules, certificate }) => (
              <div
                key={course.id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.5rem',
                }}
              >
                {/* Header */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'flex-start', marginBottom: '1rem',
                  gap: 12, flexWrap: 'wrap',
                }}>
                  <div>
                    <Link href={`/courses/${course.slug}`} style={{ textDecoration: 'none' }}>
                      <h2 style={{
                        margin: '0 0 4px', fontSize: 18,
                        fontFamily: 'var(--font-serif)', color: 'var(--text)',
                      }}>
                        {course.title}
                      </h2>
                    </Link>
                    {course.description && (
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>
                        {course.description.slice(0, 120)}{course.description.length > 120 ? '…' : ''}
                      </p>
                    )}
                  </div>

                  <div style={{ flexShrink: 0 }}>
                    {certificate ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', borderRadius: 'var(--radius-full)',
                        background: 'var(--success-bg)', color: 'var(--success)',
                        fontSize: 12, fontWeight: 700,
                      }}>
                        🏆 Certificate earned
                      </span>
                    ) : progress.pct === 100 ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', borderRadius: 'var(--radius-full)',
                        background: 'var(--amber-muted)', color: 'var(--text)',
                        fontSize: 12, fontWeight: 700,
                      }}>
                        ✓ All complete
                      </span>
                    ) : (
                      <span style={{
                        padding: '6px 12px', borderRadius: 'var(--radius-full)',
                        background: 'var(--surface-2)', color: 'var(--text-2)',
                        fontSize: 12, fontWeight: 700,
                      }}>
                        {progress.pct}% complete
                      </span>
                    )}
                  </div>
                </div>

                {/* Overall progress bar */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>
                      {progress.lessons.completed}/{progress.lessons.total} lessons
                      {progress.assessments.total > 0 && (
                        <> · {progress.assessments.passed}/{progress.assessments.total} assessments passed</>
                      )}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      {progress.pct}%
                    </span>
                  </div>
                  <div style={{ height: 8, background: 'var(--border)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${progress.pct}%`,
                      background: progress.pct === 100 ? 'var(--success)' : 'var(--amber)',
                      borderRadius: 'var(--radius-full)',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>

                {/* Per-module breakdown */}
                {modules.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1rem' }}>
                    {modules.map((mod) => (
                      <div key={mod.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{mod.title}</span>
                          <span style={{ fontSize: 12, color: mod.pct === 100 ? 'var(--success)' : 'var(--text-3)' }}>
                            {mod.pct === 100 ? '✓' : `${mod.pct}%`}
                            {' '}
                            <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>
                              {mod.lessons.completed}/{mod.lessons.total} lessons
                              {mod.assessments.total > 0 && (
                                <> · {mod.assessments.passed}/{mod.assessments.total} assessments</>
                              )}
                            </span>
                          </span>
                        </div>
                        <div style={{ height: 4, background: 'var(--border)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${mod.pct}%`,
                            background: mod.pct === 100 ? 'var(--success)' : 'var(--indigo)',
                            borderRadius: 'var(--radius-full)',
                            transition: 'width 0.3s ease',
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link href={`/courses/${course.slug}`}>
                    <button className="btn btn-outline btn-sm">
                      {progress.pct === 0 ? 'Start course' : progress.pct === 100 ? 'Review course' : 'Continue'}
                    </button>
                  </Link>
                  {certificate?.certificate_url && (
                    <a href={certificate.certificate_url} target="_blank" rel="noopener noreferrer">
                      <button className="btn btn-primary btn-sm">View certificate</button>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
