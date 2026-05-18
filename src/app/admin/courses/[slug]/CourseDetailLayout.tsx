'use client'

import { useState } from 'react'
import Link from 'next/link'
import LessonList from '@/components/LessonList'
import DeleteButton from '@/components/DeleteButton'

interface Page {
  id: string
  title: string
  slug: string | null
  page_type: string
  module_id: string | null
  is_published: boolean
  introduction: string | null
}

interface Module {
  id: string
  title: string
  description: string | null
  slug: string | null
}

interface Lesson {
  id: string
  title: string
  slug: string | null
  position: number
  is_published: boolean
  module_id: string | null
}

interface Props {
  course: { id: string; slug: string; intro_description: string | null; conclusion_description: string | null }
  modules: Module[]
  pages: Page[]
  lessons: Lesson[]
}

function CollapsibleSection({
  id, title, description, courseSlug, courseId,
  lessons, allModules,
  defaultOpen = true,
}: {
  id: string
  title: string
  description?: string | null
  courseSlug: string
  courseId: string
  lessons: Lesson[]
  allModules: Module[]
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      marginBottom: '1rem',
    }}>
      {/* Module header */}
      <div style={{
        padding: '12px 16px',
        background: 'var(--surface-2)',
        borderBottom: open ? '1px solid var(--border)' : 'none',
      }}>
        {/* Title + buttons row */}
        <div className="module-header-row" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          flexWrap: 'wrap',
        }}>
          <button
            onClick={() => setOpen((o) => !o)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, color: 'var(--text-3)', padding: '2px 4px', flexShrink: 0,
            }}
          >
            {open ? '▼' : '▶'}
          </button>
          <div className="module-header-title" style={{ fontWeight: 700, fontSize: 14, flex: 1, minWidth: 80 }}>{title}</div>
          <div className="module-header-buttons">
            <Link href={`/admin/courses/${courseSlug}/lessons/new?module=${id}`}>
              <button className="btn btn-ghost btn-sm">+ Lesson</button>
            </Link>
            <Link href={`/admin/courses/${courseSlug}/modules/${id}`}>
              <button className="btn btn-ghost btn-sm">Edit</button>
            </Link>
            <DeleteButton
              url={`/api/admin/courses/${courseId}/modules/${id}`}
              confirm={`Delete module "${title}"? Its lessons will become unassigned.`}
            />
          </div>
        </div>
        {/* Description on its own full-width row */}
        {description && (
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4, paddingLeft: 22 }}>
            {description}
          </div>
        )}
      </div>

      {open && (
        <div style={{ padding: '1rem', background: 'var(--surface)' }}>
          {lessons.length > 0 ? (
            <LessonList
              lessons={lessons}
              modules={allModules}
              courseId={courseId}
              courseSlug={courseSlug}
            />
          ) : (
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
              No lessons yet. Add one above.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

const INTRO_TYPES = ['overview', 'introduction', 'syllabus', 'requirements']

function CourseLevelSection({ label, description, pages: initialPages, courseSlug, courseId }: {
  label: string
  description?: string | null
  pages: Page[]
  courseSlug: string
  courseId: string
}) {
  const [open, setOpen] = useState(true)
  const [pages, setPages] = useState<Page[]>(initialPages)
  const [moving, setMoving] = useState<string | null>(null)

  const move = async (pageId: string, direction: 'up' | 'down') => {
    const index = pages.findIndex((p) => p.id === pageId)
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= pages.length) return

    setMoving(pageId)
    const reordered = [...pages]
    const temp = reordered[index]
    reordered[index] = reordered[swapIndex]
    reordered[swapIndex] = temp
    const withPositions = reordered.map((p, i) => ({ ...p, position: i }))
    setPages(withPositions)

    await fetch(`/api/admin/courses/${courseId}/pages/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pages: withPositions.map(({ id, position }) => ({ id, position })) }),
    })
    setMoving(null)
  }

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      marginBottom: '1rem',
    }}>
      <div style={{
        padding: '12px 16px',
        background: 'var(--surface-2)',
        borderBottom: open ? '1px solid var(--border)' : 'none',
      }}>
        {/* Section header — never wraps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setOpen((o) => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-3)', padding: '2px 4px', flexShrink: 0 }}
          >
            {open ? '▼' : '▶'}
          </button>
          <div style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{label}</div>
          <Link href={`/admin/courses/${courseSlug}/pages/new`}>
            <button className="btn btn-ghost btn-sm">+ Page</button>
          </Link>
        </div>
        {description && (
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4, paddingLeft: 22, lineHeight: 1.5 }}>
            {description}
          </div>
        )}
      </div>

      {open && (
        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--surface)' }}>
          {pages.map((page, index) => (
            <div key={page.id} style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '0.75rem 1rem',
              opacity: moving === page.id ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}>
              {/* Title + buttons on one row, buttons wrap below at narrow widths */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                  <button
                    onClick={() => move(page.id, 'up')}
                    disabled={index === 0 || !!moving}
                    style={{ background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.2 : 0.6, fontSize: 10, padding: '1px 4px', lineHeight: 1 }}
                    title="Move up"
                  >▲</button>
                  <button
                    onClick={() => move(page.id, 'down')}
                    disabled={index === pages.length - 1 || !!moving}
                    style={{ background: 'none', border: 'none', cursor: index === pages.length - 1 ? 'default' : 'pointer', opacity: index === pages.length - 1 ? 0.2 : 0.6, fontSize: 10, padding: '1px 4px', lineHeight: 1 }}
                    title="Move down"
                  >▼</button>
                </div>

                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--text)', minWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {page.title}
                </span>

                {!page.is_published && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '1px 7px',
                    borderRadius: 'var(--radius-full)', background: 'var(--surface-2)', color: 'var(--text-3)', flexShrink: 0,
                  }}>Draft</span>
                )}

                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {page.slug && (
                    <Link href={`/courses/${courseSlug}/pages/${page.slug}`} target="_blank">
                      <button className="btn btn-ghost btn-sm"><span className="preview-btn-label">Preview </span>↗</button>
                    </Link>
                  )}
                  <Link href={`/admin/courses/${courseSlug}/pages/${page.id}`}>
                    <button className="btn btn-ghost btn-sm">Edit</button>
                  </Link>
                  <DeleteButton
                    url={`/api/admin/courses/${courseId}/pages/${page.id}`}
                    confirm={`Delete "${page.title}"? This cannot be undone.`}
                  />
                </div>
              </div>

              {/* Description below */}
              {page.introduction && (
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, paddingLeft: 28, lineHeight: 1.5 }}>
                  {page.introduction}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CourseDetailLayout({ course, modules, pages, lessons }: Props) {
  const courseLevelPages = pages.filter((p) => !p.module_id)
  const introductionPages = courseLevelPages.filter((p) => INTRO_TYPES.includes(p.page_type))
  const conclusionPages = courseLevelPages.filter((p) => !INTRO_TYPES.includes(p.page_type))

  const unassignedLessons = lessons.filter((l) => !l.module_id)
  const isEmpty = modules.length === 0 && courseLevelPages.length === 0 && lessons.length === 0

  return (
    <div>
      {/* Action bar */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        marginBottom: '1.5rem', flexWrap: 'wrap',
      }}>
        <Link href={`/admin/courses/${course.slug}/modules/new`}>
          <button className="btn btn-ghost btn-sm">+ Add module</button>
        </Link>
        <Link href={`/admin/courses/${course.slug}/pages/new`}>
          <button className="btn btn-ghost btn-sm">+ Add page</button>
        </Link>
        <Link href={`/admin/courses/${course.slug}/lessons/new`}>
          <button className="btn btn-ghost btn-sm">+ Add lesson</button>
        </Link>
      </div>

      {isEmpty && (
        <div style={{
          padding: '3rem 2rem', textAlign: 'center',
          border: '1.5px dashed var(--border)', borderRadius: 'var(--radius-lg)',
          color: 'var(--text-3)', fontSize: 14,
        }}>
          No content yet. Start by adding a module.
        </div>
      )}

      {/* Introduction — course-level before-type pages */}
      {introductionPages.length > 0 && (
        <CourseLevelSection
          label="Introduction"
          description={course.intro_description}
          pages={introductionPages}
          courseSlug={course.slug}
          courseId={course.id}
        />
      )}

      {/* Module sections */}
      {modules.map((mod) => (
        <CollapsibleSection
          key={mod.id}
          id={mod.id}
          title={mod.title}
          description={mod.description}
          courseSlug={course.slug}
          courseId={course.id}
          lessons={lessons.filter((l) => l.module_id === mod.id)}
          allModules={modules}
        />
      ))}

      {/* Conclusion — course-level after-type pages */}
      {conclusionPages.length > 0 && (
        <CourseLevelSection
          label="Conclusion"
          description={course.conclusion_description}
          pages={conclusionPages}
          courseSlug={course.slug}
          courseId={course.id}
        />
      )}

      {/* Unassigned lessons only */}
      {unassignedLessons.length > 0 && (
        <div style={{
          border: '1px dashed var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          marginBottom: '1rem',
        }}>
          <div style={{
            padding: '10px 16px',
            background: 'var(--surface-2)',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)' }}>Unassigned lessons</span>
            <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 8 }}>Not yet assigned to a module</span>
          </div>
          <div style={{ padding: '1rem', background: 'var(--surface)' }}>
            <LessonList
              lessons={unassignedLessons}
              modules={modules}
              courseId={course.id}
              courseSlug={course.slug}
            />
          </div>
        </div>
      )}
    </div>
  )
}
