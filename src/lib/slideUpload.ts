import { createHmac, timingSafeEqual } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

type Ticket = { owner: string; path: string; name: string; size: number; expires: number }
const bucket = 'lesson-slides'
export function validatePdf(name: unknown, size: unknown) {
  return typeof name === 'string' && name.length <= 255 && /\.pdf$/i.test(name) &&
    typeof size === 'number' && Number.isSafeInteger(size) && size > 0 && size <= 50 * 1024 * 1024
}
function signature(payload: string, secret: string) {
  return createHmac('sha256', secret).update(`bakerversity-slide-upload:${payload}`).digest('base64url')
}
export function signSlideTicket(ticket: Ticket, secret: string) {
  const payload = Buffer.from(JSON.stringify(ticket)).toString('base64url')
  return `${payload}.${signature(payload, secret)}`
}
export function readSlideTicket(value: unknown, owner: string, secret: string): Ticket | null {
  if (typeof value !== 'string' || value.length > 4096) return null
  const [payload, supplied, extra] = value.split('.')
  if (!payload || !supplied || extra) return null
  const expected = signature(payload, secret)
  if (!/^[A-Za-z0-9_-]+$/.test(supplied) || supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return null
  try {
    const ticket = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Ticket
    if (ticket.owner !== owner || !(ticket.expires > Date.now()) || !validatePdf(ticket.name, ticket.size) ||
      typeof ticket.path !== 'string' || !ticket.path.startsWith(`${owner}/`) || !/^[a-f0-9-]+\.pdf$/.test(ticket.path.slice(owner.length + 1))) return null
    return ticket
  } catch { return null }
}

// Only metadata travels through Vercel; the browser sends PDF bytes to Storage.
export async function handleSlideUpload(body: Record<string, unknown>, ctx: { db: SupabaseClient<Database>; user: { id: string } }, secret: string) {
  const storage = ctx.db.storage.from(bucket)
  if (body.action === 'prepare') {
    if (!validatePdf(body.name, body.size)) return Response.json({ error: 'Choose a non-empty PDF no larger than 50 MB.' }, { status: 400 })
    const ticket: Ticket = { owner: ctx.user.id, path: `${ctx.user.id}/${crypto.randomUUID()}.pdf`, name: body.name as string, size: body.size as number, expires: Date.now() + 2 * 60 * 60 * 1000 }
    const { data, error } = await storage.createSignedUploadUrl(ticket.path)
    if (error || !data) {
      console.error('slides.prepare', error?.message)
      return Response.json({ error: 'Storage could not authorize the PDF upload. Please retry.' }, { status: 502 })
    }
    return Response.json({ signedUrl: data.signedUrl, ticket: signSlideTicket(ticket, secret) }, { headers: { 'Cache-Control': 'no-store' } })
  }
  if (body.action !== 'complete') return Response.json({ error: 'Unknown upload action.' }, { status: 400 })
  const ticket = readSlideTicket(body.ticket, ctx.user.id, secret)
  if (!ticket) return Response.json({ error: 'The upload authorization expired or is invalid. Choose the PDF again.' }, { status: 400 })
  const { data: info, error: infoError } = await storage.info(ticket.path)
  if (infoError || !info) return Response.json({ error: 'The PDF has not reached storage. Please retry the upload.' }, { status: 502 })
  if (info.size !== ticket.size || info.contentType !== 'application/pdf') {
    return Response.json({ error: 'The stored file does not match the selected PDF. Please choose the file again.' }, { status: 400 })
  }
  // A completion retry must not create another asset or overwrite edited metadata.
  const { error } = await ctx.db.from('assets').upsert({ owner_id: ticket.owner, title: ticket.name, original_filename: ticket.name, mime_type: 'application/pdf', byte_size: ticket.size, bucket, object_path: ticket.path }, { onConflict: 'bucket,object_path', ignoreDuplicates: true })
  if (error) {
    console.error('slides.register', error.message)
    return Response.json({ error: 'The PDF reached storage, but could not be registered. Please retry.' }, { status: 502 })
  }
  const { data: asset, error: readError } = await ctx.db.from('assets').select('id').eq('bucket', bucket).eq('object_path', ticket.path).eq('owner_id', ticket.owner).single()
  if (readError || !asset) return Response.json({ error: 'The PDF registration could not be confirmed. Please retry.' }, { status: 502 })
  return Response.json({ asset_id: asset.id, url: storage.getPublicUrl(ticket.path).data.publicUrl })
}
