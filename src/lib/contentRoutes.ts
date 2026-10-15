import { NextResponse } from 'next/server'
import { adminAccess } from '@/lib/adminAccess'
import type { Json } from '@/lib/database.types'
import { resourceSelection } from '@/lib/authoring/resources'

type ContentTable = 'lessons' | 'course_pages' | 'assessments'
const common = ['title', 'slug', 'module_id', 'placement', 'is_required', 'estimated_minutes', 'activity_type', 'resources']
const fields: Record<ContentTable, string[]> = {
  lessons: [...common, 'content', 'introduction', 'youtube_url', 'slides_url', 'slides_meta'],
  course_pages: [...common, 'page_type', 'content', 'introduction'],
  assessments: [...common, 'assessment_type', 'is_graded', 'passing_score', 'intro_content'],
}

export async function readContent(courseId: string, itemId: string, table: ContentTable) {
  const ctx = await adminAccess(courseId)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { data, error } = await ctx.db.rpc('get_authoring_content', {
    p_item: itemId, p_author: ctx.user.id, p_kind: table === 'lessons' ? 'lesson' : table === 'course_pages' ? 'page' : 'assessment',
  })
  if (error) return NextResponse.json({ error: 'Unable to load saved draft and resources. Check that the resource migration has been applied.' }, { status: 500 })
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.course_id !== courseId) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function writeContent(req: Request, courseId: string, itemId: string, table: ContentTable) {
  const ctx = await adminAccess(courseId)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { data: item } = await ctx.db.from('course_items').select('version').eq('id', itemId).eq('course_id', courseId).single()
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json()
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid content' }, { status: 400 })
  // Existing list publication toggles remain supported; editor saves carry versions.
  const publicationToggle = Object.keys(body).length === 1 && typeof body.is_published === 'boolean'
  if (!publicationToggle && !Number.isInteger(body.version)) {
    return NextResponse.json({ error: 'Reload this editor before saving.' }, { status: 409 })
  }
  const patch = Object.fromEntries(Object.entries(body).filter(([k]) => fields[table].includes(k))) as Record<string, Json>
  if ('resources' in body) {
    try { patch.resources = resourceSelection(body.resources).map(row => ({ ...row })) }
    catch { return NextResponse.json({ error: 'Invalid resource selection' }, { status: 400 }) }
  }
  if (patch.assessment_type === 'practice') patch.is_graded = false
  if (typeof patch.title === 'string' && !patch.title.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  if (patch.slug !== undefined && (typeof patch.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(patch.slug))) {
    return NextResponse.json({ error: 'Use lowercase letters, numbers and hyphens in the URL slug.' }, { status: 400 })
  }
  const action = publicationToggle ? (body.is_published ? 'publish' : 'unpublish') : body.action ?? 'draft'
  const { data, error } = await ctx.db.rpc('save_content', { p_item: itemId, p_author: ctx.user.id, p_expected_version: body.version ?? item.version, p_patch: patch, p_action: action })
  if (error) return NextResponse.json({ error: error.message }, { status: error.code === '40001' ? 409 : 400 })
  return NextResponse.json(data)
}

export async function archiveContent(courseId: string, itemId: string, table: ContentTable) {
  const ctx = await adminAccess(courseId)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { error } = await ctx.db.from(table).update({ is_published: false, archived_at: new Date().toISOString() }).eq('id', itemId).eq('course_id', courseId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
