import Link from 'next/link'
import { buildCourseSequence, sequenceItemHref, INTRO_PAGE_TYPES, type SequenceItem, type SeqModule, type SeqLesson, type SeqPage, type SeqAssessment } from '@/lib/courseSequence'
import styles from './CourseOutline.module.css'

const pageLabels: Record<string,string> = {overview:'Overview',introduction:'Introduction',syllabus:'Syllabus',requirements:'Requirements',resources:'Resources',conclusion:'Conclusion',custom:'Page'}
function category(item:SequenceItem) {
 if(item.type==='lesson')return {label:'Lesson',tone:'lesson'}
 if(item.type==='assessment')return {label:item.assessment_type==='exam'?'Exam':item.assessment_type==='practice'?'Practice':'Quiz',tone:item.assessment_type??'quiz'}
 return {label:pageLabels[item.page_type??'custom']??'Page',tone:'page'}
}
function placement(item:SequenceItem) {
 return item.placement ?? (item.type==='page'?((INTRO_PAGE_TYPES as readonly string[]).includes(item.page_type??'')?'introduction':'conclusion'):'body')
}
export default function CourseOutline({courseSlug,modules,lessons,pages,assessments,canAccess}:{courseSlug:string;modules:SeqModule[];lessons:SeqLesson[];pages:SeqPage[];assessments:SeqAssessment[];canAccess:boolean}) {
 const items=buildCourseSequence({modules,lessons,pages,assessments})
 const groups:{key:string;title:string;label:string;items:SequenceItem[]}[]=[]
 const orderedModules=[...modules].sort((a,b)=>a.position-b.position||a.id.localeCompare(b.id))
 for(const item of items){
  const key=item.module_id??placement(item)
  let group=groups[groups.length-1]
  if(!group||group.key!==key){
   const module=orderedModules.find(m=>m.id===item.module_id)
   group={key,title:module?.title??({introduction:'Getting started',body:'Course content',conclusion:'Wrapping up'}[placement(item)]),label:module?'Module '+(orderedModules.indexOf(module)+1):'Course section',items:[]}
   groups.push(group)
  }
  group.items.push(item)
 }
 if(!groups.length)return <p className={styles.empty}>Course content will appear here when it is published.</p>
 return <div className={styles.outline}>{groups.map((group,groupIndex)=><section className={styles.section} key={group.key} aria-labelledby={'outline-section-'+groupIndex}>
  <header className={styles.heading}>
   <div><span className={styles.eyebrow}>{group.label}</span><h3 id={'outline-section-'+groupIndex}>{group.title}</h3></div>
   <span className={styles.count}>{group.items.length} {group.items.length===1?'item':'items'}</span>
  </header>
  <ol className={styles.list}>{group.items.map((item,index)=>{
   const type=category(item),href=sequenceItemHref(courseSlug,item)
   const contents=<><span className={styles.number} aria-hidden="true">{String(index+1).padStart(2,'0')}</span><span className={styles.title}>{item.title}{(item.is_required===false||item.estimated_minutes)&&<span className={styles.meta}>{[item.is_required===false?'Optional':null,item.estimated_minutes?item.estimated_minutes+' min':null].filter(Boolean).join(' · ')}</span>}</span><span className={styles.category}><span className={styles.badge+' '+styles[type.tone]}>{type.label}</span>{item.type==='assessment'&&item.assessment_type==='practice'&&<span className={styles.kind}>Assessment</span>}</span><span className={styles.arrow} aria-hidden="true">{canAccess&&href?'→':'—'}</span></>
   return <li key={item.id}>{canAccess&&href?<Link className={styles.row} href={href}>{contents}</Link>:<div className={styles.row}>{contents}</div>}</li>
  })}</ol>
 </section>)}</div>
}
