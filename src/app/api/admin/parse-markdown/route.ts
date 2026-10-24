import {parseMarkdownImport,importableFields} from '@/lib/markdownImport.mjs'
import { currentUser } from '@clerk/nextjs/server'
import { authorAccessFor } from '@/lib/adminAccess'
import { NextResponse } from 'next/server'
import { markdownToTipTap } from '@/lib/markdownToTipTap'

const MAX_FILE_SIZE = 500_000 // 500KB — generous for a text file
const ALLOWED_TYPES = ['text/markdown', 'text/plain', 'text/x-markdown']
const ALLOWED_EXTENSIONS = ['.md', '.mdx', '.txt', '.markdown']

export async function POST(req: Request) {
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if(!await authorAccessFor(clerkUser.id))return NextResponse.json({error:'Forbidden'},{status:403})

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large. Maximum size is 500KB.' }, { status: 400 })
  }

  // Validate extension
  const name = file.name.toLowerCase()
  const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))
  if (!hasValidExtension) {
    return NextResponse.json(
      { error: 'Invalid file type. Accepted: .md, .mdx, .txt, .markdown' },
      { status: 400 }
    )
  }

  // Validate MIME type (browsers may send text/plain for .md — that's fine)
  const mime = file.type.toLowerCase().split(';')[0].trim()
  if (mime && !ALLOWED_TYPES.includes(mime) && mime !== '') {
    // Some systems send empty MIME — allow that too
    return NextResponse.json(
      { error: 'Invalid MIME type. File must be a text or markdown file.' },
      { status: 400 }
    )
  }

  const text = await file.text()

  // Basic sanity check — ensure it's readable text (not a binary file with .md extension)
  if (text.includes('\x00')) {
    return NextResponse.json({ error: 'File appears to be binary, not text.' }, { status: 400 })
  }

  try {
    const requested=String(formData.get('metadata_fields')??'').split(',').filter(field=>importableFields.includes(field))
    const parsed=parseMarkdownImport(text,requested)
    const tiptapJson = markdownToTipTap(parsed.body)
    return NextResponse.json({ content: tiptapJson,metadata:parsed.metadata,warnings:parsed.warnings,skippedByDesign:parsed.skippedByDesign })
  } catch (err) {
    console.error('Markdown parse error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to parse markdown file.' }, { status: 400 })
  }
}
