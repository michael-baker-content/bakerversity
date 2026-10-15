import { NextResponse } from 'next/server'
import { adminAccess } from '@/lib/adminAccess'
type Context = { params: Promise<{ itemId: string }> }
async function access(itemId: string) {
  const ctx = await adminAccess()
  if (!ctx) return null
  const { data } = await ctx.db.from('course_items').select('course_id').eq('id', itemId).single()
  return data ? adminAccess(data.course_id) : null
}
export async function GET(_req: Request, { params }: Context) {
  const { itemId } = await params
  const ctx = await access(itemId)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { data, error } = await ctx.db.from('item_assets').select('asset_id,purpose,assets(title)').eq('item_id', itemId)
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json(data)
}
export async function POST(_req: Request, { params }: Context) {
  const { itemId } = await params
  const ctx = await access(itemId)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return NextResponse.json({ error: 'Reload the editor. Resources are now selected locally and saved with the item draft.' }, { status: 410 })
}
