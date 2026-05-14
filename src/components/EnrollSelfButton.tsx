'use client'

import { useState } from 'react'

interface Props {
  courseId: string
  isEnrolled: boolean
}

export default function EnrollSelfButton({ courseId, isEnrolled }: Props) {
  const [enrolled, setEnrolled] = useState(isEnrolled)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/enroll-self', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      })
      if (res.ok) {
        const data = await res.json()
        setEnrolled(data.enrolled)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="btn btn-ghost btn-sm"
      style={{ opacity: loading ? 0.6 : 1 }}
      title={enrolled ? 'Unenroll yourself from this course' : 'Enroll yourself to test the student view'}
    >
      {enrolled ? '✓ Enrolled (self)' : '+ Enroll self'}
    </button>
  )
}
