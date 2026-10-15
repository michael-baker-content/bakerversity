import { NextResponse } from 'next/server'
import { adminAccess } from '@/lib/adminAccess'
import { uploadAsset } from '@/lib/assetUpload'
export async function GET() {
  const ctx = await adminAccess()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  let query = ctx.db.from('assets').select('*, item_assets(item_id)').order('created_at', { ascending: false }).limit(200)
  if (ctx.user.role !== 'admin') query = query.eq('owner_id', ctx.user.id)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json((data ?? []).map(a => ({ ...a, url: a.external_url ?? (a.bucket && a.object_path ? ctx.db.storage.from(a.bucket).getPublicUrl(a.object_path).data.publicUrl : '') })))
}
export async function POST(req: Request) { return uploadAsset(req, 'resource') }
export async function PATCH(req: Request) {
  const ctx = await adminAccess()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id, title, alt_text, attribution } = await req.json()
  let query = ctx.db.from('assets').update({ title, alt_text, attribution }).eq('id', id)
  if (ctx.user.role !== 'admin') query = query.eq('owner_id', ctx.user.id)
  const { error } = await query
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true })
}
