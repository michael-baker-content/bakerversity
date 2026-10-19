import { NextResponse } from 'next/server'
import { adminAccess } from '@/lib/adminAccess'
export async function uploadAsset(req: Request, kind: 'image' | 'slides' | 'resource') {
  const ctx = await adminAccess()
  if (!ctx) return NextResponse.json({ error: 'Instructor access required' }, { status: 403 })
  const courseId = new URL(req.url).searchParams.get('course_id')
  if (courseId && !(await adminAccess(courseId))) return NextResponse.json({error:'Course access required'}, {status:403})
  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File) || !file.size) return NextResponse.json({ error: 'Select a file' }, { status: 400 })
  if (file.size > 50 * 1024 * 1024) return NextResponse.json({ error: 'Maximum file size is 50 MB' }, { status: 400 })
  const imageTypes: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }
  let ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (kind === 'image') {
    if (!imageTypes[file.type]) return NextResponse.json({ error: 'Use JPEG, PNG, WebP or GIF' }, { status: 400 })
    ext = imageTypes[file.type]
  } else if (kind === 'slides') {
    if (ext !== 'pdf' || file.type !== 'application/pdf') return NextResponse.json({ error: 'Use a PDF file' }, { status: 400 })
  } else if (!['pdf','zip','json','xliff','xlf','csv','tsv','txt','xml','yaml','yml','md','py','js','ts','srt','vtt','po','pot'].includes(ext)) {
    return NextResponse.json({ error: 'Unsupported resource format' }, { status: 400 })
  }
  const bucket = kind === 'image' ? 'lesson-images' : 'lesson-slides'
  const objectPath = `${ctx.user.id}/${crypto.randomUUID()}.${ext}`
  const mime = kind === 'resource' ? 'application/octet-stream' : file.type
  const { error: uploadError } = await ctx.db.storage.from(bucket).upload(objectPath, await file.arrayBuffer(), { contentType: mime, cacheControl: kind === 'image' ? '31536000' : '3600' })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })
  const { data: asset, error } = await ctx.db.from('assets').insert({ owner_id: ctx.user.id, title: file.name, original_filename: file.name, mime_type: mime, byte_size: file.size, bucket, object_path: objectPath }).select('id').single()
  if (error) {
    await ctx.db.storage.from(bucket).remove([objectPath])
    return NextResponse.json({ error: 'The file could not be registered. Please retry.' }, { status: 500 })
  }
  if (courseId) {
    const {error: linkError} = await ctx.db.from('course_assets').insert({course_id:courseId,asset_id:asset.id})
    if (linkError) {
      await ctx.db.from('assets').delete().eq('id',asset.id)
      await ctx.db.storage.from(bucket).remove([objectPath])
      return NextResponse.json({error:'Unable to add file to the course library. Please retry.'}, {status:500})
    }
  }
  return NextResponse.json({ asset_id: asset.id, url: ctx.db.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl })
}
