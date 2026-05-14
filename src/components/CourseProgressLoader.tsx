'use client'

import { useEffect, useState } from 'react'
import ModuleProgressBars from './ModuleProgressBars'

interface ModuleProgress {
  id: string
  title: string
  total: number
  completed: number
  pct: number
}

interface ProgressData {
  overall: { total: number; completed: number; pct: number }
  pages: { total: number; read: number }
  modules: ModuleProgress[]
  completed_lesson_ids: string[]
  certificate: { id: string; issued_at: string } | null
}

export default function CourseProgressLoader({ courseId }: { courseId: string }) {
  const [data, setData] = useState<ProgressData | null>(null)

  useEffect(() => {
    fetch(`/api/admin/courses/${courseId}/completions`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {}) // silently fail — user may not be enrolled
  }, [courseId])

  if (!data || data.overall.total === 0) return null

  return (
    <ModuleProgressBars
      modules={data.modules}
      overall={data.overall}
      hasCertificate={!!data.certificate}
    />
  )
}
