import { adminAccess } from '@/lib/adminAccess'
import { handleSlideUpload } from '@/lib/slideUpload'

export async function POST(req: Request) {
  try {
    const ctx = await adminAccess()
    if (!ctx) return Response.json({ error: 'Sign in with instructor access before uploading a PDF.' }, { status: 403 })
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body)) return Response.json({ error: 'Invalid upload request. Reload the editor after saving your work.' }, { status: 400 })
    return await handleSlideUpload(body, ctx, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  } catch (error) {
    console.error('slides.upload', error instanceof Error ? error.message : 'Unexpected error')
    return Response.json({ error: 'The PDF upload service could not respond. Please retry.' }, { status: 502 })
  }
}
