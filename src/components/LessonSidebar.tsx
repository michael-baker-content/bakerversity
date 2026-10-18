"use client"

import { useId, useState } from 'react'
import Link from 'next/link'
import { useOutlineScroll } from './useOutlineScroll'
import { buildCourseSequence, sequenceItemHref, INTRO_PAGE_TYPES, type SeqLesson, type SeqAssessment, type SeqPage, type SeqModule } from '@/lib/courseSequence'

interface LessonSidebarProps {
  courseSlug: string
  courseTitle: string
  courseHomeUrl?: string
  lessons: SeqLesson[]
  modules: SeqModule[]
  pages: SeqPage[]
  assessments?: SeqAssessment[]
  // Exactly one of these will be set depending on what the student is viewing
  currentLessonId?: string
  currentLessonSlug?: string | null
  currentPageId?: string
  currentAssessmentId?: string
}

function SidebarContent(props: LessonSidebarProps & { onNavigate?: () => void }) {
  const items = buildCourseSequence({ modules: props.modules, lessons: props.lessons, pages: props.pages, assessments: props.assessments ?? [] })
  const section = (item: typeof items[number]) => item.module_id ?? item.placement ?? (item.type === 'page' ? ((INTRO_PAGE_TYPES as readonly string[]).includes(item.page_type ?? '') ? 'introduction' : 'conclusion') : 'body')
  const labels: Record<string, string> = { introduction: 'Getting started', body: 'Course content', conclusion: 'Wrapping up' }
  return <nav aria-label="Course contents" className="course-outline">
    <div className="course-outline-heading">
      <span className="lesson-eyebrow">Your classroom</span>
      <Link href={props.courseHomeUrl ?? `/courses/${props.courseSlug}`} className="course-outline-title" onClick={props.onNavigate}>{props.courseTitle}</Link>
      <span className="course-outline-count">{items.length} {items.length === 1 ? 'item' : 'items'} · Course contents</span>
    </div>
    <ol className="course-outline-list">
      {items.map((item, index) => {
        const key = section(item)
        const active = item.id === props.currentLessonId || item.id === props.currentPageId || item.id === props.currentAssessmentId || (item.type === 'lesson' && !!props.currentLessonSlug && item.slug === props.currentLessonSlug)
        const title = item.module_id ? props.modules.find(m => m.id === item.module_id)?.title : labels[key]
        const href = sequenceItemHref(props.courseSlug, item)
        const content = <><span className="course-outline-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span className="course-outline-item-copy"><span>{item.title}</span><small>{item.type === 'assessment' ? item.assessment_type ?? 'Assessment' : item.type === 'page' ? 'Reading' : 'Lesson'}{item.is_required === false ? ' · Optional' : ''}{active ? ' · You are here' : ''}</small></span></>
        return <li key={item.id}>
          {(index === 0 || section(items[index - 1]) !== key) && <h2 className="course-outline-section">{title ?? 'Course content'}</h2>}
          {href ? <Link href={href} className="course-outline-link" aria-current={active ? 'page' : undefined} onClick={props.onNavigate}>{content}</Link> : <div className="course-outline-link course-outline-unavailable">{content}</div>}
        </li>
      })}
    </ol>
    <Link className="course-outline-back" href={props.courseHomeUrl ?? `/courses/${props.courseSlug}`} onClick={props.onNavigate}>← Course overview</Link>
  </nav>
}

export default function LessonSidebar(props: LessonSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const panelId = useId()
  const desktopScroll = useOutlineScroll(props.courseSlug, 'desktop')
  const mobileScroll = useOutlineScroll(props.courseSlug, 'mobile', mobileOpen)
  return <>
    <aside ref={desktopScroll.ref} onScroll={desktopScroll.remember} className="lesson-sidebar-desktop"><SidebarContent {...props} onNavigate={desktopScroll.remember} /></aside>
    <div className="lesson-sidebar-mobile" onKeyDown={e => {
      if (e.key === 'Escape') { setMobileOpen(false); document.getElementById(`${panelId}-toggle`)?.focus() }
    }}>
      <button id={`${panelId}-toggle`} type="button" className="course-outline-toggle" aria-expanded={mobileOpen} aria-controls={panelId} onClick={() => setMobileOpen(value => !value)}>
        <span>Course contents</span><span aria-hidden="true">{mobileOpen ? '−' : '+'}</span>
      </button>
      <div ref={mobileScroll.ref} onScroll={mobileScroll.remember} id={panelId} hidden={!mobileOpen} className="course-outline-mobile-panel"><SidebarContent {...props} onNavigate={() => { mobileScroll.remember(); setMobileOpen(false) }} /></div>
    </div>
  </>
}
