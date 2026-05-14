import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import SiteNavClient from './SiteNavClient'

interface SiteNavProps {
  active?: 'courses' | 'dashboard'
}

export default async function SiteNav({ active }: SiteNavProps) {
  const clerkUser = await currentUser()

  let isAdmin = false
  if (clerkUser) {
    const supabase = createServiceClient()
    const { data: user } = await supabase
      .from('users').select('role').eq('clerk_id', clerkUser.id).single()
    isAdmin = user?.role === 'admin' || user?.role === 'instructor'
  }

  return (
    <SiteNavClient
      active={active}
      isSignedIn={!!clerkUser}
      isAdmin={isAdmin}
    />
  )
}
