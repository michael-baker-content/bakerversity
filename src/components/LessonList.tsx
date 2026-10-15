'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { lessonHref, buildModuleSlugMap } from '@/lib/lessonUrl'

interface Module {
  id: string
  title: string
  slug?: string | null
}

interface Lesson {
  id: string
  slug: string | null
  title: string
  position: number
  is_published: boolean
  module_id: string | null
}

interface LessonListProps {
  lessons: Lesson[]
  modules: Module[]
  courseId: string
  courseSlug: string
}

export default function LessonList({ lessons: initialLessons, modules, courseId, courseSlug }: LessonListProps) {
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons)
  const [moving, setMoving] = useState<string | null>(null)
  const router = useRouter()
  const moduleSlugMap = buildModuleSlugMap(modules)

  const move = async (lessonId: string, direction: 'up' | 'down') => {
    const index = lessons.findIndex((l) => l.id === lessonId)
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= lessons.length) return

    setMoving(lessonId)

    const reordered = [...lessons]
    const temp = reordered[index]
    reordered[index] = reordered[swapIndex]
    reordered[swapIndex] = temp
    const withPositions = reordered.map((l, i) => ({ ...l, position: i }))
    setLessons(withPositions)

    await fetch(`/api/admin/courses/${courseId}/lessons/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessons: withPositions.map(({ id, position }) => ({ id, position })),
      }),
    })

    setMoving(null)
    router.refresh()
  }

  if (!lessons.length) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-3)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
        <p style={{ margin: '0 0 0.5rem' }}>No lessons yet.</p>
        <Link href={`/admin/courses/${courseSlug}/lessons/new`} style={{ color: 'var(--indigo)', fontSize: 14 }}>Add your first lesson →</Link>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {lessons.map((lesson, index) => (
        <div key={lesson.id} style={{
          padding: '0.75rem 1rem',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          opacity: moving === lesson.id ? 0.5 : 1,
          transition: 'opacity 0.15s',
        }}>
          {/* Top row: arrows + number + title + published badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, marginBottom: 6 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
              <button
                onClick={() => move(lesson.id, 'up')}
                disabled={index === 0 || !!moving}
                style={{ background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.2 : 0.6, fontSize: 10, padding: '1px 4px', lineHeight: 1 }}
                title="Move up"
              >▲</button>
              <button
                onClick={() => move(lesson.id, 'down')}
                disabled={index === lessons.length - 1 || !!moving}
                style={{ background: 'none', border: 'none', cursor: index === lessons.length - 1 ? 'default' : 'pointer', opacity: index === lessons.length - 1 ? 0.2 : 0.6, fontSize: 10, padding: '1px 4px', lineHeight: 1 }}
                title="Move down"
              >▼</button>
            </div>

            <span style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0 }}>{index + 1}</span>

            <span style={{ fontWeight: 500, fontSize: 14, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lesson.title}
            </span>

            <span style={{
              fontSize: 11, padding: '1px 6px', borderRadius: 'var(--radius-full)', flexShrink: 0,
              background: lesson.is_published ? 'var(--success-bg)' : 'var(--surface-2)',
              color: lesson.is_published ? 'var(--success)' : 'var(--text-3)',
            }}>
              {lesson.is_published ? 'Published' : 'Draft'}
            </span>
          </div>

          {/* Bottom row: module dropdown + edit + preview — wraps naturally at narrow widths */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap', alignItems: 'center', paddingLeft: 28 }}>
            <span style={{ fontSize: 12 }}>{modules.find(m => m.id === lesson.module_id)?.title ?? 'No module'}</span>
            <Link href={`/admin/courses/${courseSlug}/lessons/${lesson.slug ?? lesson.id}`}>
              <button className="btn btn-ghost btn-sm">Edit</button>
            </Link>
            {lesson.slug && (
              <Link href={lessonHref(courseSlug, lesson, moduleSlugMap)} target="_blank">
                <button className="btn btn-ghost btn-sm">
                  <span className="preview-btn-label">Preview </span>↗
                </button>
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
