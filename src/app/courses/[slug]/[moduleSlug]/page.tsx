import { createServiceClient } from '@/lib/supabase'
import { notFound, redirect } from 'next/navigation'

export default async function ModuleLandingPage({
  params,
}: {
  params: Promise<{ slug: string; moduleSlug: string }>
}) {
  const { slug, moduleSlug } = await params
  const supabase = createServiceClient()

  const { data: course } = await supabase
    .from('courses').select('id').eq('slug', slug).eq('is_published', true).single()
  if (!course) notFound()

  const { data: module_ } = await supabase
    .from('modules').select('id')
    .eq('course_id', course.id)
    .eq('slug', moduleSlug)
    .single()
  if (!module_) notFound()

  // Get the first published lesson in this module by position
  const { data: firstLesson } = await supabase
    .from('lessons').select('slug, id')
    .eq('module_id', module_.id)
    .eq('is_published', true)
    .order('position', { ascending: true })
    .limit(1)
    .single()

  if (!firstLesson) {
    // No lessons in this module — fall back to the course page
    redirect(`/courses/${slug}`)
  }

  const lessonSlug = firstLesson.slug ?? firstLesson.id
  redirect(`/courses/${slug}/${moduleSlug}/${lessonSlug}`)
}
