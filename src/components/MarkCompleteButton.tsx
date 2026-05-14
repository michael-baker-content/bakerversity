'use client'

import { useState } from 'react'

interface Props {
  lessonId: string
  courseId: string
  initialCompleted: boolean
}

export default function MarkCompleteButton({ lessonId, courseId, initialCompleted }: Props) {
  const [completed, setCompleted] = useState(initialCompleted)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      const method = completed ? 'DELETE' : 'POST'
      const body = completed
        ? JSON.stringify({ lesson_id: lessonId })
        : JSON.stringify({ lesson_id: lessonId, course_id: courseId })

      const res = await fetch('/api/student/completions', { method, body,
        headers: { 'Content-Type': 'application/json' }
      })

      if (res.ok) setCompleted(!completed)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 20px',
        borderRadius: 'var(--radius)',
        border: completed ? '2px solid var(--success)' : '2px solid var(--border-strong)',
        background: completed ? 'var(--success-bg)' : 'var(--surface)',
        color: completed ? 'var(--success)' : 'var(--text-2)',
        fontSize: 14,
        fontWeight: 600,
        cursor: loading ? 'default' : 'pointer',
        transition: 'all 0.15s ease',
        opacity: loading ? 0.6 : 1,
      }}
    >
      <span style={{ fontSize: 16 }}>{completed ? '✓' : '○'}</span>
      {completed ? 'Completed' : 'Mark complete'}
    </button>
  )
}
