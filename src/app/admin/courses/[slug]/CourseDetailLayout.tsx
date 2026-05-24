'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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

interface Assessment {
  id: string
  title: string
  slug: string | null
  assessment_type: 'quiz' | 'exam' | 'practice'
  is_graded: boolean
  is_published: boolean
  module_id: string | null
  position: number
}

interface Props {
  course: { id: string; slug: string; intro_description: string | null; conclusion_description: string | null }
  modules: Module[]
  pages: Page[]
  lessons: Lesson[]
  assessments: Assessment[]
}

// ── Sequence item — unified type for interleaved rendering ────────────────────

type SequenceItem =
  | { kind: 'lesson'; item: Lesson }
  | { kind: 'assessment'; item: Assessment }

const ASSESSMENT_TYPE_LABELS: Record<string, string> = {
  quiz: 'Quiz',
  exam: 'Exam',
  practice: 'Practice',
}

const ASSESSMENT_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  quiz:     { bg: 'var(--amber-muted)',  color: 'var(--amber-hover)' },
  exam:     { bg: 'var(--indigo-muted)', color: 'var(--indigo)' },
  practice: { bg: 'var(--surface-2)',    color: 'var(--text-3)' },
}

// ── CollapsibleSection — owns and reorders the full mixed sequence ─────────────

function CollapsibleSection({
  id,
  title,
  description,
  courseSlug,
  courseId,
  initialLessons,
  initialAssessments,
  allModules,
  defaultOpen = true,
}: {
  id: string
  title: string
  description?: string | null
  courseSlug: string
  courseId: string
  initialLessons: Lesson[]
  initialAssessments: Assessment[]
  allModules: Module[]
  defaultOpen?: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(defaultOpen)
  const [moving, setMoving] = useState<string | null>(null)

  // Single interleaved sequence sorted by position.
  // We keep it in state so swaps are reflected immediately (optimistic UI).
  const [sequence, setSequence] = useState<SequenceItem[]>(() =>
    [
      ...initialLessons.map((l): SequenceItem => ({ kind: 'lesson', item: l })),
      ...initialAssessments.map((a): SequenceItem => ({ kind: 'assessment', item: a })),
    ].sort((a, b) => a.item.position - b.item.position)
  )

  const move = async (itemId: string, direction: 'up' | 'down') => {
    const index = sequence.findIndex((s) => s.item.id === itemId)
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= sequence.length) return

    setMoving(itemId)

    // Swap and reassign positions 0..n-1
    const next = [...sequence]
    const temp = next[index]
    next[index] = next[swapIndex]
    next[swapIndex] = temp
    const withPositions = next.map((s, i) => ({
      ...s,
      item: { ...s.item, position: i },
    })) as SequenceItem[]
    setSequence(withPositions)

    // Persist lessons and assessments separately — each has its own endpoint
    const lessons = withPositions
      .filter((s): s is { kind: 'lesson'; item: Lesson } => s.kind === 'lesson')
      .map(({ item }) => ({ id: item.id, position: item.position }))

    const assessments = withPositions
      .filter((s): s is { kind: 'assessment'; item: Assessment } => s.kind === 'assessment')
      .map(({ item }) => ({ id: item.id, position: item.position }))

    await Promise.all([
      lessons.length > 0 &&
        fetch(`/api/admin/courses/${courseId}/lessons/reorder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessons }),
        }),
      assessments.length > 0 &&
        fetch(`/api/admin/courses/${courseId}/assessments/reorder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assessments }),
        }),
    ])

    setMoving(null)
    router.refresh()
  }

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
        <div className="module-header-row" style={{
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
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
          <div className="module-header-title" style={{ fontWeight: 700, fontSize: 14, flex: 1, minWidth: 80 }}>
            {title}
          </div>
          <div className="module-header-buttons">
            <Link href={`/admin/courses/${courseSlug}/lessons/new?module=${id}`}>
              <button className="btn btn-ghost btn-sm">+ Lesson</button>
            </Link>
            <Link href={`/admin/courses/${courseSlug}/assessments/new?module=${id}`}>
              <button className="btn btn-ghost btn-sm">+ Assessment</button>
            </Link>
            <Link href={`/admin/courses/${courseSlug}/modules/${id}`}>
              <button className="btn btn-ghost btn-sm">Edit</button>
            </Link>
            <DeleteButton
              url={`/api/admin/courses/${courseId}/modules/${id}`}
              confirm={`Delete module "${title}"? Its lessons and assessments will become unassigned.`}
            />
          </div>
        </div>
        {description && (
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4, paddingLeft: 22 }}>
            {description}
          </div>
        )}
      </div>

      {open && (
        <div style={{ padding: '1rem', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sequence.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
              No content yet. Add a lesson or assessment above.
            </p>
          ) : (
            sequence.map((entry, index) => {
              const isLesson = entry.kind === 'lesson'
              const item = entry.item
              const id = item.id
              const isMoving = moving === id

              const upDisabled = index === 0 || !!moving
              const downDisabled = index === sequence.length - 1 || !!moving

              return (
                <div
                  key={id}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '0.75rem 1rem',
                    opacity: isMoving ? 0.4 : 1,
                    transition: 'opacity 0.15s',
                    background: 'var(--surface)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {/* Reorder arrows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                      <button
                        onClick={() => move(id, 'up')}
                        disabled={upDisabled}
                        style={{
                          background: 'none', border: 'none',
                          cursor: upDisabled ? 'default' : 'pointer',
                          opacity: upDisabled ? 0.2 : 0.6,
                          fontSize: 10, padding: '1px 4px', lineHeight: 1,
                        }}
                        title="Move up"
                      >▲</button>
                      <button
                        onClick={() => move(id, 'down')}
                        disabled={downDisabled}
                        style={{
                          background: 'none', border: 'none',
                          cursor: downDisabled ? 'default' : 'pointer',
                          opacity: downDisabled ? 0.2 : 0.6,
                          fontSize: 10, padding: '1px 4px', lineHeight: 1,
                        }}
                        title="Move down"
                      >▼</button>
                    </div>

                    {/* Type badge — only for assessments */}
                    {!isLesson && (() => {
                      const a = item as Assessment
                      const { bg, color } = ASSESSMENT_TYPE_COLORS[a.assessment_type] ?? ASSESSMENT_TYPE_COLORS.practice
                      return (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 7px',
                          borderRadius: 'var(--radius-full)',
                          background: bg, color,
                          flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em',
                        }}>
                          {ASSESSMENT_TYPE_LABELS[a.assessment_type] ?? a.assessment_type}
                        </span>
                      )
                    })()}

                    {/* Title */}
                    <span style={{
                      flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--text)',
                      minWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {item.title}
                    </span>

                    {/* Draft badge */}
                    {!item.is_published && (
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '1px 7px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--surface-2)', color: 'var(--text-3)', flexShrink: 0,
                      }}>Draft</span>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {isLesson ? (
                        <>
                          <Link href={`/admin/courses/${courseSlug}/lessons/${(item as Lesson).slug ?? item.id}`}>
                            <button className="btn btn-ghost btn-sm">Edit</button>
                          </Link>
                          {(item as Lesson).slug && (
                            <Link href={`/courses/${courseSlug}/lessons/${(item as Lesson).slug}`} target="_blank">
                              <button className="btn btn-ghost btn-sm">Preview ↗</button>
                            </Link>
                          )}
                          <DeleteButton
                            url={`/api/admin/courses/${courseId}/lessons/${item.id}`}
                            confirm={`Delete "${item.title}"? This cannot be undone.`}
                          />
                        </>
                      ) : (
                        <>
                          <Link href={`/admin/courses/${courseSlug}/assessments/${item.id}`}>
                            <button className="btn btn-ghost btn-sm">Edit</button>
                          </Link>
                          {(item as Assessment).slug && (
                            <Link href={`/courses/${courseSlug}/assessments/${(item as Assessment).slug}`} target="_blank">
                              <button className="btn btn-ghost btn-sm">Preview ↗</button>
                            </Link>
                          )}
                          <DeleteButton
                            url={`/api/admin/courses/${courseId}/assessments/${item.id}`}
                            confirm={`Delete "${item.title}"? This cannot be undone.`}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// ── CourseLevelSection — pages only, unchanged logic ─────────────────────────

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

// ── Root layout component ─────────────────────────────────────────────────────

export default function CourseDetailLayout({ course, modules, pages, lessons, assessments }: Props) {
  const courseLevelPages = pages.filter((p) => !p.module_id)
  const introductionPages = courseLevelPages.filter((p) => INTRO_TYPES.includes(p.page_type))
  const conclusionPages = courseLevelPages.filter((p) => !INTRO_TYPES.includes(p.page_type))

  // Unassigned lessons (no module) still shown in their own section
  const unassignedLessons = lessons.filter((l) => !l.module_id)

  const isEmpty =
    modules.length === 0 &&
    courseLevelPages.length === 0 &&
    lessons.length === 0 &&
    assessments.length === 0

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
        <Link href={`/admin/courses/${course.slug}/assessments/new`}>
          <button className="btn btn-ghost btn-sm">+ Add assessment</button>
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

      {introductionPages.length > 0 && (
        <CourseLevelSection
          label="Introduction"
          description={course.intro_description}
          pages={introductionPages}
          courseSlug={course.slug}
          courseId={course.id}
        />
      )}

      {modules.map((mod) => (
        <CollapsibleSection
          key={mod.id}
          id={mod.id}
          title={mod.title}
          description={mod.description}
          courseSlug={course.slug}
          courseId={course.id}
          initialLessons={lessons.filter((l) => l.module_id === mod.id)}
          initialAssessments={assessments.filter((a) => a.module_id === mod.id)}
          allModules={modules}
        />
      ))}

      {conclusionPages.length > 0 && (
        <CourseLevelSection
          label="Conclusion"
          description={course.conclusion_description}
          pages={conclusionPages}
          courseSlug={course.slug}
          courseId={course.id}
        />
      )}

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
          <div style={{ padding: '1rem', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {unassignedLessons.map((lesson, index) => (
              <div key={lesson.id} style={{
                padding: '0.75rem 1rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{lesson.title}</span>
                  {!lesson.is_published && (
                    <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 'var(--radius-full)', background: 'var(--surface-2)', color: 'var(--text-3)' }}>Draft</span>
                  )}
                  <Link href={`/admin/courses/${course.slug}/lessons/${lesson.slug ?? lesson.id}`}>
                    <button className="btn btn-ghost btn-sm">Edit</button>
                  </Link>
                  <DeleteButton
                    url={`/api/admin/courses/${course.id}/lessons/${lesson.id}`}
                    confirm={`Delete "${lesson.title}"? This cannot be undone.`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
