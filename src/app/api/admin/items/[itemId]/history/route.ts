import { NextResponse } from 'next/server'
import { adminAccess } from '@/lib/adminAccess'
type Context = { params: Promise<{ itemId: string }> }
export async function GET(_req: Request, { params }: Context) {
  const { itemId } = await params
  const ctx = await adminAccess()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { data: item } = await ctx.db.from('course_items').select('course_id').eq('id', itemId).single()
  if (!item || !(await adminAccess(item.course_id))) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { data, error } = await ctx.db.from('content_revisions').select('id, version, created_at, snapshot').eq('item_id', itemId).order('version', { ascending: false }).limit(50)
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json(data)
}
