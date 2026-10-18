'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

/** Route-handler writes do not invalidate Next's browser navigation cache. */
export default function RefreshCourseOverview() {
  const pathname = usePathname()
  const router = useRouter()
  useEffect(() => {
    if (/^\/admin\/courses\/[^/]+\/?$/.test(pathname) && pathname !== '/admin/courses/new') {
      // Refresh in place: retain scroll position and the overview's expanded sections.
      router.refresh()
    }
  }, [pathname, router])
  return null
}
