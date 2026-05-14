import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

const supabase = createServiceClient()

async function assertAdmin(clerkId: string) {
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('clerk_id', clerkId)
    .single()
  return data?.role === 'admin' || data?.role === 'instructor'
}

// GET /api/admin/certificates — list all certificates
export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await assertAdmin(clerkId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('certificates')
    .select(`
      id,
      issued_at,
      certificate_url,
      users ( id, email, full_name ),
      courses ( id, title, slug )
    `)
    .order('issued_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ certificates: data })
}

// DELETE /api/admin/certificates — delete a certificate by id
export async function DELETE(req: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await assertAdmin(clerkId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('certificates').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
