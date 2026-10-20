import LessonViewer from '@/components/LessonViewerPage'
export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false } }
export default async function DraftLessonPreview({params}:{params:Promise<{slug:string;lessonId:string}>}) {
 const {slug,lessonId}=await params
 return LessonViewer({params:Promise.resolve({slug,moduleSlug:'lessons',lessonSlug:lessonId}),draftPreviewId:lessonId})
}
