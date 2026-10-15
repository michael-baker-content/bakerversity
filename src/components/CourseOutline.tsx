import Link from 'next/link'
import { buildCourseSequence, sequenceItemHref, type SeqModule, type SeqLesson, type SeqPage, type SeqAssessment } from '@/lib/courseSequence'
export default function CourseOutline({ courseSlug, modules, lessons, pages, assessments, canAccess }: { courseSlug: string; modules: SeqModule[]; lessons: SeqLesson[]; pages: SeqPage[]; assessments: SeqAssessment[]; canAccess: boolean }) {
  const items = buildCourseSequence({ modules, lessons, pages, assessments })
  return <ol style={{ listStyle: 'none', padding: 0 }}>{items.map((item,index) => {
    const previous = items[index-1]
    const group = item.module_id ? modules.find(m=>m.id===item.module_id)?.title : item.placement ?? 'Course content'
    const href = sequenceItemHref(courseSlug,item)
    return <li key={item.id} style={{ marginBottom: 8 }}>
      {(!previous || previous.module_id!==item.module_id || (!item.module_id && previous.placement!==item.placement)) && <h3 style={{fontSize:14,marginTop:20}}>{group}</h3>}
      <div style={{ padding:12, border:'1px solid var(--border)',borderRadius:8 }}>{canAccess && href ? <Link href={href}>{item.title}</Link> : <span>{item.title}</span>} <small style={{color:'var(--text-3)'}}> · {item.type}{item.is_required === false ? ' · Optional' : ''}{item.estimated_minutes ? ` · ${item.estimated_minutes} min` : ''}</small></div>
    </li>
  })}</ol>
}
