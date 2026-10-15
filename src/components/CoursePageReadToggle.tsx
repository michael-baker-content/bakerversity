'use client'

import { useState, useEffect } from 'react'

export default function CoursePageReadToggle({
  pageId,
  courseId,
}: {
  pageId: string
  courseId: string
}) {
  const [read, setRead] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/course-pages?courseId=${courseId}`)
      .then((r) => r.json())
      .then((data) => {
        setRead((data.read ?? []).includes(pageId))
        setLoading(false)
      })
  }, [pageId, courseId])

  const toggle = async () => {
    setSaving(true)
    const res = await fetch('/api/course-pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageId, read: !read }),
    })
    const data = await res.json()
    if (res.ok) setRead(data.read)
    else alert(data.error ?? 'Unable to save read status')
    setSaving(false)
  }

  if (loading) return null

  return (
    <button
      onClick={toggle}
      disabled={saving}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 14px',
        fontSize: 13,
        border: '1px solid',
        borderColor: read ? '#bbf7d0' : '#ddd',
        borderRadius: 20,
        background: read ? '#f0fdf4' : 'white',
        color: read ? '#166534' : '#555',
        cursor: saving ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {read ? '✓ Marked as read' : 'Mark as read'}
    </button>
  )
}
