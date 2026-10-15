import { createServiceClient } from '@/lib/supabase'
export async function getLearningProgress(userId: string) {
  const db = createServiceClient()
  const { data: enrollments, error } = await db.from('enrollments').select('course_id,enrolled_at,courses!inner(id,title,slug,description,is_published,archived_at)').eq('user_id',userId).eq('courses.is_published',true).is('courses.archived_at',null)
  if(error)throw new Error('Unable to load enrollments')
  if(!enrollments.length)return []
  const ids=enrollments.map(e=>e.course_id)
  const results=await Promise.all([
    db.from('course_items').select('id,course_id,module_id,kind').in('course_id',ids).eq('status','published').eq('is_required',true),
    db.from('lesson_completions').select('lesson_id').eq('user_id',userId).in('course_id',ids),
    db.from('course_page_views').select('course_page_id').eq('user_id',userId),
    db.from('assessment_completions').select('assessment_id').eq('user_id',userId).in('course_id',ids).eq('passed',true),
    db.from('modules').select('id,course_id,title,position').in('course_id',ids).order('position'),
    db.from('certificates').select('course_id,issued_at,certificate_url').eq('user_id',userId).in('course_id',ids).is('revoked_at',null),
  ])
  if(results.some(r=>r.error))throw new Error('Unable to load learning progress')
  const [itemRows,lessonRows,pageRows,assessmentRows,moduleRows,certificateRows]=results
  const completed=new Set([...(lessonRows.data??[]).map(x=>x.lesson_id),...(pageRows.data??[]).map(x=>x.course_page_id),...(assessmentRows.data??[]).map(x=>x.assessment_id)])
  const summarize=(items:NonNullable<typeof itemRows.data>)=>{
    const count=(kind:string)=>({total:items.filter(i=>i.kind===kind).length,completed:items.filter(i=>i.kind===kind&&completed.has(i.id)).length})
    const lessons=count('lesson'),pages=count('page'),assessments=count('assessment')
    const done=items.filter(i=>completed.has(i.id)).length
    return {lessons,pages,assessments:{total:assessments.total,passed:assessments.completed},total:items.length,completed:done,pct:items.length?Math.round(100*done/items.length):0,pages_total:pages.total,pages_complete:pages.total===pages.completed}
  }
  return enrollments.map(e=>{
    const items=(itemRows.data??[]).filter(i=>i.course_id===e.course_id)
    return {course:{...e.courses,description:e.courses.description??''},enrolled_at:e.enrolled_at,progress:summarize(items),modules:(moduleRows.data??[]).filter(m=>m.course_id===e.course_id).map(m=>({id:m.id,title:m.title,...summarize(items.filter(i=>i.module_id===m.id))})),certificate:certificateRows.data?.find(c=>c.course_id===e.course_id)??null}
  })
}
