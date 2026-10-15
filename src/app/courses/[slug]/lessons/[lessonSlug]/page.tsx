import LessonPage from '@/app/courses/[slug]/[moduleSlug]/[lessonSlug]/page'
export default async function StandaloneLessonPage({ params }: { params: Promise<{slug:string;lessonSlug:string}> }) {
  const p = await params
  return LessonPage({ params: Promise.resolve({ ...p, moduleSlug: 'lessons' }) })
}
