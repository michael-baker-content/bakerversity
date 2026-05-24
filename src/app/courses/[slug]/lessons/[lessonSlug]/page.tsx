import { createServiceClient } from '@/lib/supabase'
import { currentUser } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'

/**
 * Legacy lesson URL: /courses/[slug]/lessons/[lessonSlug]
 * Redirects to the new canonical URL: /courses/[slug]/[moduleSlug]/[lessonSlug]
 *
 * Instructors can preview unpublished lessons and courses.
 * Students are blocked from unpublished content as normal.
 */
export default async function LegacyLessonRedirect({
  params,
}: {
  params: Promise<{ slug: string; lessonSlug: string }>
}) {
  const { slug, lessonSlug } = await params
  const clerkUser = await currentUser()
  const supabase = createServiceClient()

  // Determine if the viewer is an instructor so we can bypass published checks
  let isInstructor = false
  if (clerkUser) {
    const { data: dbUser } = await supabase
      .from('users').select('role').eq('clerk_id', clerkUser.id).single()
    isInstructor = dbUser?.role === 'instructor' || dbUser?.role === 'admin'
  }

  // Load course — instructors can see unpublished courses
  const courseQuery = supabase.from('courses').select('id').eq('slug', slug)
  const { data: course } = await (isInstructor
    ? courseQuery
    : courseQuery.eq('is_published', true)
  ).single()
  if (!course) notFound()

  // Find lesson by slug or UUID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lessonSlug)
  const lessonQuery = supabase
    .from('lessons').select('id, slug, module_id')
    .eq(isUuid ? 'id' : 'slug', lessonSlug)
    .eq('course_id', course.id)
  const { data: lesson } = await (isInstructor
    ? lessonQuery
    : lessonQuery.eq('is_published', true)
  ).single()
  if (!lesson) notFound()

  // Redirect to canonical URL with module slug
  if (lesson.module_id) {
    const { data: module_ } = await supabase
      .from('modules').select('slug').eq('id', lesson.module_id).single()

    if (module_?.slug) {
      const ls = lesson.slug ?? lesson.id
      redirect(`/courses/${slug}/${module_.slug}/${ls}`)
    }
  }

  // Fallback: no module assigned
  if (isUuid && lesson.slug) redirect(`/courses/${slug}/lessons/${lesson.slug}`)
  notFound()
}
