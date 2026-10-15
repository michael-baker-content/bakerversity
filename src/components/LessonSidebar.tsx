'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  buildCourseSequence,
  sequenceItemHref,
  INTRO_PAGE_TYPES,
  type SeqLesson,
  type SeqAssessment,
  type SeqPage,
  type SeqModule,
  type SequenceItem,
} from '@/lib/courseSequence'

// ── Props ─────────────────────────────────────────────────────────────────────

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

const ASSESSMENT_TYPE_LABELS: Record<string, string> = {
  quiz: 'Quiz', exam: 'Exam', practice: 'Practice',
}

// ── Link components ───────────────────────────────────────────────────────────

function SidebarLink({ href, active, children, indent }: {
  href: string
  active?: boolean
  children: React.ReactNode
  indent?: boolean
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        padding: '7px 1rem',
        paddingLeft: indent ? '1.75rem' : '1rem',
        fontSize: 13, lineHeight: 1.4,
        color: active ? 'var(--text)' : 'var(--text-2)',
        fontWeight: active ? 500 : 400,
        background: active ? 'var(--surface-2)' : 'transparent',
        borderLeft: `3px solid ${active ? 'var(--indigo)' : 'transparent'}`,
        transition: 'background 0.1s, color 0.1s',
      }}>
        {children}
      </div>
    </Link>
  )
}

function NumberedLink({ href, active, number, title }: {
  href: string
  active: boolean
  number: number
  title: string
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        padding: '5px 0.75rem',
        paddingLeft: '1.25rem',
        display: 'grid',
        gridTemplateColumns: '20px 1fr',
        gap: 6,
        alignItems: 'start',
        background: active ? 'var(--surface-2)' : 'transparent',
        borderLeft: `3px solid ${active ? 'var(--indigo)' : 'transparent'}`,
        transition: 'background 0.1s',
      }}>
        <span style={{
          fontSize: 10, color: 'var(--text-3)', fontWeight: 600,
          paddingTop: 2, lineHeight: 1.4, textAlign: 'right',
        }}>
          {number}
        </span>
        <span style={{
          fontSize: 13, lineHeight: 1.4,
          color: active ? 'var(--text)' : 'var(--text-2)',
          fontWeight: active ? 500 : 400,
        }}>
          {title}
        </span>
      </div>
    </Link>
  )
}

function AssessmentLink({ href, active, label, title }: {
  href: string
  active: boolean
  label: string
  title: string
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        padding: '5px 0.75rem 5px 1.25rem',
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        background: active ? 'var(--surface-2)' : 'transparent',
        borderLeft: `3px solid ${active ? 'var(--indigo)' : 'transparent'}`,
        transition: 'background 0.1s',
      }}>
        <span style={{
          fontSize: 9, fontWeight: 700, flexShrink: 0,
          color: active ? 'var(--indigo)' : 'var(--text-3)',
          textTransform: 'uppercase', letterSpacing: '0.05em',
          paddingTop: 1,
        }}>
          {label}
        </span>
        <span style={{
          fontSize: 13, lineHeight: 1.4,
          color: active ? 'var(--text)' : 'var(--text-2)',
          fontWeight: active ? 500 : 400,
        }}>
          {title}
        </span>
      </div>
    </Link>
  )
}

function ModuleHeader({ title, collapsed, onToggle }: {
  title: string; collapsed: boolean; onToggle: () => void
}) {
  return (
    <button onClick={onToggle} style={{
      width: '100%', textAlign: 'left',
      padding: '7px 1rem',
      fontSize: 10, fontWeight: 700,
      color: 'var(--text-3)',
      textTransform: 'uppercase', letterSpacing: '0.06em',
      background: 'none', border: 'none', cursor: 'pointer',
      borderTop: '1px solid var(--border)',
      marginTop: 4,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
      <span style={{ flexShrink: 0, marginLeft: 4, fontSize: 8 }}>{collapsed ? '▶' : '▼'}</span>
    </button>
  )
}

function SectionDivider({ label, collapsible, collapsed, onToggle }: {
  label?: string; collapsible?: boolean; collapsed?: boolean; onToggle?: () => void
}) {
  return (
    <button onClick={collapsible ? onToggle : undefined} style={{
      width: '100%', textAlign: 'left',
      padding: '8px 1rem 4px',
      fontSize: 10, fontWeight: 700,
      color: 'var(--text-3)',
      textTransform: 'uppercase', letterSpacing: '0.07em',
      marginTop: 0, background: 'none', border: 'none',
      borderTop: '1px solid var(--border)',
      cursor: collapsible ? 'pointer' : 'default',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <span>{label}</span>
      {collapsible && <span style={{ fontSize: 8 }}>{collapsed ? '▶' : '▼'}</span>}
    </button>
  )
}

// ── Sidebar content ───────────────────────────────────────────────────────────

function SidebarContent(props: LessonSidebarProps & { onNavClick?: () => void }) {
  const items = buildCourseSequence({ modules: props.modules, lessons: props.lessons, pages: props.pages, assessments: props.assessments ?? [] })
  return <nav aria-label="Course contents" style={{paddingBottom:24}}>
    <SidebarLink href={props.courseHomeUrl ?? '/courses/'+props.courseSlug}>← Course details</SidebarLink>
    {items.map((item,index) => {
      const previous=items[index-1]
      const title=item.module_id ? props.modules.find(m=>m.id===item.module_id)?.title : item.placement ?? 'Course content'
      const href=sequenceItemHref(props.courseSlug,item)
      const active=item.id===props.currentLessonId || item.id===props.currentPageId || item.id===props.currentAssessmentId
      return <div key={item.id} onClick={props.onNavClick}>
        {(!previous || previous.module_id!==item.module_id || (!item.module_id && previous.placement!==item.placement)) && <SectionDivider label={title} />}
        {href && <SidebarLink href={href} active={active} indent={!!item.module_id}>{item.title}{item.is_required===false ? ' · Optional' : ''}</SidebarLink>}
      </div>
    })}
  </nav>
}

// ── Shell with mobile drawer ──────────────────────────────────────────────────

export default function LessonSidebar(props: LessonSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const currentLesson = props.lessons.find(
    (l) => l.id === props.currentLessonId || (props.currentLessonSlug && l.slug === props.currentLessonSlug)
  )
  const currentPage = props.currentPageId
    ? props.pages.find((p) => p.id === props.currentPageId)
    : null
  const currentAssessment = props.currentAssessmentId
    ? (props.assessments ?? []).find((a) => a.id === props.currentAssessmentId)
    : null

  // Build sequence just to get the index for the mobile label
  const sequence = buildCourseSequence({
    modules: props.modules,
    lessons: props.lessons,
    assessments: props.assessments ?? [],
    pages: props.pages,
  })
  const currentIndex = sequence.findIndex((s) => {
    if (props.currentPageId) return s.type === 'page' && s.id === props.currentPageId
    if (props.currentAssessmentId) return s.type === 'assessment' && s.id === props.currentAssessmentId
    return s.type === 'lesson' && (s.id === props.currentLessonId || s.slug === props.currentLessonSlug)
  })
  const lessonCount = props.lessons.length

  const mobileLabel = currentPage
    ? currentPage.title
    : currentAssessment
      ? currentAssessment.title
      : currentLesson
        ? `Lesson ${currentIndex + 1}: ${currentLesson.title}`
        : 'Contents'

  return (
    <>
      {/* Desktop */}
      <aside className="lesson-sidebar-desktop">
        <SidebarContent {...props} />
      </aside>

      {/* Mobile top bar */}
      <div className="lesson-sidebar-mobile">
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 1rem', height: 48,
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 52, zIndex: 40,
        }}>
          <Link
            href={props.courseHomeUrl ?? `/courses/${props.courseSlug}`}
            style={{ fontSize: 13, color: 'var(--text-3)', textDecoration: 'none' }}
          >
            ← Back
          </Link>
          <button
            onClick={() => setMobileOpen((o) => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '5px 10px',
              cursor: 'pointer', color: 'var(--text-2)',
              maxWidth: '60vw', overflow: 'hidden',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {mobileLabel}
            </span>
            <span style={{ flexShrink: 0, fontSize: 10 }}>{mobileOpen ? '▲' : '▼'}</span>
          </button>
        </div>

        {mobileOpen && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 39 }}
              onClick={() => setMobileOpen(false)}
            />
            <div style={{
              position: 'fixed', top: 100, left: 0, right: 0,
              background: 'var(--surface)', borderBottom: '1px solid var(--border)',
              zIndex: 40, maxHeight: '60vh', overflowY: 'auto',
              boxShadow: 'var(--shadow)',
            }}>
              <SidebarContent {...props} onNavClick={() => setMobileOpen(false)} />
            </div>
          </>
        )}
      </div>
    </>
  )
}
