import { createServiceClient } from '@/lib/supabase'
import { currentUser } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import AssessmentTaker from '@/components/AssessmentTaker'
import LessonSidebar from '@/components/LessonSidebar'
import SiteNav from '@/components/SiteNav'
import { buildCourseSequence, sequenceItemHref } from '@/lib/courseSequence'
import type { Course, User, Lesson } from '@/lib/types'

interface Module { id: string; title: string; position: number; slug: string | null }
interface CoursePage {
  id: string; slug: string | null; title: string
  page_type: string; module_id: string | null; position: number
}
interface Assessment {
  id: string; slug: string | null; title: string
  assessment_type: 'quiz' | 'exam' | 'practice'
  is_graded: boolean; passing_score: number
  intro_content: Record<string, unknown> | null
  position: number; module_id: string | null; is_published: boolean
}

interface Question {
  id: string; question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'text_response'
  content: Record<string, unknown> | null; question_text: string | null
  options: string[] | null; explanation: string | null
  explanation_content: Record<string, unknown> | null; position: number
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; assessmentSlug: string }>
}) {
  const { assessmentSlug } = await params
  const supabase = createServiceClient()
  const { data } = await supabase.from('assessments').select('title').eq('slug', assessmentSlug).single()
  return { title: data?.title ?? 'Assessment' }
}

export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ slug: string; assessmentSlug: string }>
}) {
  const { slug, assessmentSlug } = await params

  // Assessments always require authentication — even on public courses.
  // Redirect unauthenticated visitors to sign-in with return URL.
  const clerkUser = await currentUser()
  if (!clerkUser) {
    redirect(`/sign-in?redirect=${encodeURIComponent(`/courses/${slug}/assessments/${assessmentSlug}`)}`)
  }

  const serviceSupabase = createServiceClient()

  const { data: dbUser } = await serviceSupabase
    .from('users').select('*').eq('clerk_id', clerkUser.id).single<User>()
  if (!dbUser) redirect('/sign-in')

  const isInstructor = dbUser.role === 'instructor' || dbUser.role === 'admin'

  const courseQuery = serviceSupabase.from('courses').select('*').eq('slug', slug)
  const { data: course } = await (isInstructor
    ? courseQuery
    : courseQuery.eq('is_published', true)
  ).single<Course>()
  if (!course) notFound()

  // Enrollment check for paid courses
  if (!isInstructor && course.price_cents > 0) {
    const { data: enrollment } = await serviceSupabase
      .from('enrollments').select('id').eq('user_id', dbUser.id).eq('course_id', course.id).single()
    if (!enrollment) redirect(`/courses/${slug}`)
  }

  const assessmentQuery = serviceSupabase
    .from('assessments')
    .select('id, title, slug, assessment_type, is_graded, passing_score, intro_content, module_id, position, is_published')
    .eq('course_id', course.id)
    .eq('slug', assessmentSlug)
  const { data: assessment } = await (isInstructor
    ? assessmentQuery
    : assessmentQuery.eq('is_published', true)
  ).single<Assessment>()
  if (!assessment) notFound()

  // Questions — students don't receive correct_answer or accepted_answers
  const { data: questions } = await serviceSupabase
    .from('assessment_questions')
    .select('id, question_type, content, question_text, options, explanation, explanation_content, position')
    .eq('assessment_id', assessment.id)
    .order('position', { ascending: true })

  // Sidebar/sequence data — always published-only
  const [lessonsRes, modulesRes, pagesRes, allAssessmentsRes] = await Promise.all([
    serviceSupabase.from('lessons')
      .select('id, slug, title, position, module_id')
      .eq('course_id', course.id).eq('is_published', true).order('position', { ascending: true })
      .returns<Pick<Lesson, 'id' | 'slug' | 'title' | 'position' | 'module_id'>[]>(),
    serviceSupabase.from('modules')
      .select('id, title, position, slug')
      .eq('course_id', course.id).order('position', { ascending: true })
      .returns<Module[]>(),
    serviceSupabase.from('course_pages')
      .select('id, slug, title, page_type, module_id, position')
      .eq('course_id', course.id).eq('is_published', true).order('position', { ascending: true }),
    serviceSupabase.from('assessments')
      .select('id, slug, title, assessment_type, position, module_id')
      .eq('course_id', course.id).eq('is_published', true).order('position', { ascending: true }),
  ])

  const allLessons = lessonsRes.data ?? []
  const modules = modulesRes.data ?? []
  const coursePages = (pagesRes.data ?? []) as CoursePage[]
  const allAssessments = (allAssessmentsRes.data ?? []) as Assessment[]

  const sequence = buildCourseSequence({
    modules, lessons: allLessons, assessments: allAssessments, pages: coursePages,
  })

  const currentIndex = sequence.findIndex(
    (s) => s.type === 'assessment' && (s.id === assessment.id || s.slug === assessment.slug)
  )
  const prevItem = currentIndex > 0 ? sequence[currentIndex - 1] : null
  const nextItem = currentIndex < sequence.length - 1 ? sequence[currentIndex + 1] : null

  return (
    <>
      <SiteNav />
      <div className="lesson-viewer-layout">
        <div className="lesson-viewer-outer">
          <LessonSidebar
            courseSlug={slug}
            courseTitle={course.title}
            courseHomeUrl={isInstructor && !course.is_published ? `/admin/courses/${slug}` : undefined}
            lessons={allLessons}
            modules={modules}
            pages={coursePages}
            assessments={allAssessments}
            currentLessonId=""
            currentLessonSlug={null}
            currentAssessmentId={assessment.id}
          />

          <main className="lesson-main">
            <AssessmentTaker
              assessmentId={assessment.id}
              title={assessment.title}
              assessmentType={assessment.assessment_type}
              isGraded={assessment.is_graded}
              passingScore={assessment.passing_score}
              introContent={assessment.intro_content}
              questions={(questions ?? []) as Question[]}
            />

            {/* Prev / Next */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              marginTop: '3rem', paddingTop: '1.5rem',
              borderTop: '1px solid var(--border)',
              gap: 8,
            }}>
              {prevItem ? (
                <Link href={sequenceItemHref(slug, prevItem)} style={{ minWidth: 0, maxWidth: '45vw' }}>
                  <button className="btn btn-ghost" style={{ maxWidth: '100%', textAlign: 'left' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ flexShrink: 0 }}>←</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {prevItem.title}
                      </span>
                    </span>
                  </button>
                </Link>
              ) : <div />}

              {nextItem ? (
                <Link href={sequenceItemHref(slug, nextItem)} style={{ minWidth: 0, maxWidth: '45vw' }}>
                  <button className="btn btn-ghost" style={{ maxWidth: '100%', textAlign: 'right' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {nextItem.title}
                      </span>
                      <span style={{ flexShrink: 0 }}>→</span>
                    </span>
                  </button>
                </Link>
              ) : (
                <Link href={`/courses/${slug}`}>
                  <button className="btn btn-primary">Back to course</button>
                </Link>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  )
}
