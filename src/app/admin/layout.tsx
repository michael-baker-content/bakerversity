import SiteNav from '@/components/SiteNav'
import RefreshCourseOverview from '@/components/RefreshCourseOverview'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav />
      <RefreshCourseOverview />
      {children}
    </>
  )
}
