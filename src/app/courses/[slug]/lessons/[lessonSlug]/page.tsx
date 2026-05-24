import { createServiceClient } from '@/lib/supabase'
import { currentUser } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'

/**
 * Legacy lesson URL: /courses/[slug]/lessons/[lessonSlug]
 * Redirects to the canonical URL: /courses/[slug]/[moduleSlug]/[lessonSlug]
 *
 * On public free courses, unauthenticated visitors are allowed through.
 * On non-public or paid courses, unauthenticated visitors are redirected to sign-in.
 */
export default async function LegacyLessonRedirect({
  params,
}: {
  params: Promise<{ slug: string; lessonSlug: string }>
}) {
  const { slug, lessonSlug } = await params
  const clerkUser = await currentUser()
  const supabase = createServiceClient()

  let isInstructor = false
  if (clerkUser) {
    const { data: dbUser } = await supabase
      .from('users').select('role').eq('clerk_id', clerkUser.id).single()
    isInstructor = dbUser?.role === 'instructor' || dbUser?.role === 'admin'
  }

  const courseQuery = supabase.from('courses').select('id, is_public, price_cents').eq('slug', slug)
  const { data: course } = await (isInstructor
    ? courseQuery
    : courseQuery.eq('is_published', true)
  ).single()
  if (!course) notFound()

  // Gate unauthenticated visitors on non-public or paid courses
  if (!clerkUser && (!course.is_public || course.price_cents > 0)) {
    redirect(`/sign-in?redirect=/courses/${slug}/lessons/${lessonSlug}`)
  }

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

  if (lesson.module_id) {
    const { data: module_ } = await supabase
      .from('modules').select('slug').eq('id', lesson.module_id).single()
    if (module_?.slug) {
      redirect(`/courses/${slug}/${module_.slug}/${lesson.slug ?? lesson.id}`)
    }
  }

  if (isUuid && lesson.slug) redirect(`/courses/${slug}/lessons/${lesson.slug}`)
  notFound()
}
