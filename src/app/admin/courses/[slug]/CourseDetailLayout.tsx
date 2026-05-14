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
}

interface Module {
  id: string
  title: string
  description: string | null
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
  course: { id: string; slug: string }
  modules: Module[]
  pages: Page[]
  lessons: Lesson[]
}

function PageRow({ page, courseSlug, courseId }: { page: Page; courseSlug: string; courseId: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '9px 14px',
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 14, flexShrink: 0, paddingTop: 1 }}>📄</span>
      <span style={{ flex: 1, fontSize: 14, color: 'var(--text)', fontWeight: 500, minWidth: 80 }}>
        {page.title}
        {!page.is_published && (
          <span style={{
            display: 'inline-block', marginLeft: 8,
            fontSize: 11, fontWeight: 600, padding: '1px 7px',
            borderRadius: 'var(--radius-full)', background: 'var(--surface-2)', color: 'var(--text-3)',
          }}>Draft</span>
        )}
      </span>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
        {page.slug && (
          <Link href={`/courses/${courseSlug}/pages/${page.slug}`} target="_blank">
            <button className="btn btn-ghost btn-sm">Preview ↗</button>
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
  )
}

function CollapsibleSection({
  id, title, description, courseSlug, courseId,
  pages, lessons, modules, allModules, allLessons,
  defaultOpen = true,
}: {
  id: string
  title: string
  description?: string | null
  courseSlug: string
  courseId: string
  pages: Page[]
  lessons: Lesson[]
  modules: Module[]
  allModules: Module[]
  allLessons: Lesson[]
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
        display: 'flex', alignItems: 'flex-start', gap: 8,
        padding: '12px 16px',
        background: 'var(--surface-2)',
        borderBottom: open ? '1px solid var(--border)' : 'none',
        flexWrap: 'wrap',
      }}>
        <button
          onClick={() => setOpen((o) => !o)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color: 'var(--text-3)', padding: '4px 4px 0', flexShrink: 0,
          }}
        >
          {open ? '▼' : '▶'}
        </button>
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
          {description && (
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{description}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
          <Link href={`/admin/courses/${courseSlug}/pages/new?module=${id}`}>
            <button className="btn btn-ghost btn-sm">+ Page</button>
          </Link>
          <Link href={`/admin/courses/${courseSlug}/lessons/new?module=${id}`}>
            <button className="btn btn-ghost btn-sm">+ Lesson</button>
          </Link>
          <Link href={`/admin/courses/${courseSlug}/modules/${id}`}>
            <button className="btn btn-ghost btn-sm">Edit</button>
          </Link>
          <DeleteButton
            url={`/api/admin/courses/${courseId}/modules/${id}`}
            confirm={`Delete module "${title}"? Its lessons and pages will become unassigned.`}
          />
        </div>
      </div>

      {open && (
        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--surface)' }}>
          {/* Pages in this module */}
          {pages.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
                Pages
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {pages.map((page) => (
                  <PageRow key={page.id} page={page} courseSlug={courseSlug} courseId={courseId} />
                ))}
              </div>
            </div>
          )}

          {/* Lessons in this module */}
          {lessons.length > 0 ? (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
                Lessons
              </p>
              <LessonList
                lessons={lessons}
                modules={allModules}
                courseId={courseId}
                courseSlug={courseSlug}
              />
            </div>
          ) : (
            pages.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
                No content yet. Add a page or lesson above.
              </p>
            )
          )}
        </div>
      )}
    </div>
  )
}

const INTRO_TYPES = ['overview', 'introduction', 'syllabus', 'requirements']

function CourseLevelSection({ label, pages, courseSlug, courseId }: {
  label: string
  pages: Page[]
  courseSlug: string
  courseId: string
}) {
  const [open, setOpen] = useState(true)

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      marginBottom: '1rem',
    }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        padding: '12px 16px',
        background: 'var(--surface-2)',
        borderBottom: open ? '1px solid var(--border)' : 'none',
        flexWrap: 'wrap',
      }}>
        <button
          onClick={() => setOpen((o) => !o)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-3)', padding: '4px 4px 0', flexShrink: 0 }}
        >
          {open ? '▼' : '▶'}
        </button>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--text)', minWidth: 80 }}>{label}</span>
        <Link href={`/admin/courses/${courseSlug}/pages/new`}>
          <button className="btn btn-ghost btn-sm">+ Page</button>
        </Link>
      </div>
      {open && (
        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--surface)' }}>
          {pages.map((page) => (
            <PageRow key={page.id} page={page} courseSlug={courseSlug} courseId={courseId} />
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
          <button className="btn btn-outline btn-sm">+ Add module</button>
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
          pages={pages.filter((p) => p.module_id === mod.id)}
          lessons={lessons.filter((l) => l.module_id === mod.id)}
          modules={modules}
          allModules={modules}
          allLessons={lessons}
        />
      ))}

      {/* Conclusion — course-level after-type pages */}
      {conclusionPages.length > 0 && (
        <CourseLevelSection
          label="Conclusion"
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
