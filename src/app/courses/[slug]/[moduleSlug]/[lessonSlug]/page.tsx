import renderLesson from '@/components/LessonViewerPage'
export default async function LessonViewerPage({params}:{params:Promise<{slug:string;moduleSlug:string;lessonSlug:string}>}) {return renderLesson({params})}
