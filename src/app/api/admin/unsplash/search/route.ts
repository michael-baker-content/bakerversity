import { currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'bakerversity'
const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY

// ── GET /api/admin/unsplash/search?q=...&page=1 ───────────────
// Proxies search to Unsplash keeping the access key server-side.
// Returns a shaped subset of the Unsplash response.

export async function GET(req: Request) {
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!ACCESS_KEY) {
    return NextResponse.json({ error: 'Unsplash API key not configured' }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')?.trim()
  const page = searchParams.get('page') ?? '1'

  if (!query) return NextResponse.json({ results: [], total: 0 })

  const url = new URL('https://api.unsplash.com/search/photos')
  url.searchParams.set('query', query)
  url.searchParams.set('page', page)
  url.searchParams.set('per_page', '12')
  url.searchParams.set('orientation', 'landscape')
  url.searchParams.set('content_filter', 'high')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Unsplash request failed' }, { status: res.status })
  }

  const data = await res.json()

  // Shape the response — only return what the picker needs
  const results = (data.results ?? []).map((photo: UnsplashPhoto) => ({
    id: photo.id,
    thumb: photo.urls.thumb,
    small: photo.urls.small,
    regular: photo.urls.regular,
    alt: photo.alt_description ?? photo.description ?? '',
    photographer_name: photo.user.name,
    photographer_url: `https://unsplash.com/@${photo.user.username}?utm_source=${APP_NAME}&utm_medium=referral`,
    unsplash_url: `https://unsplash.com/?utm_source=${APP_NAME}&utm_medium=referral`,
  }))

  return NextResponse.json({ results, total_pages: data.total_pages ?? 1 })
}

// ── POST /api/admin/unsplash/search — trigger download event ──
// Unsplash guidelines require triggering the download endpoint
// when a user selects a photo. Called when instructor confirms
// a photo selection in the picker.

export async function POST(req: Request) {
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!ACCESS_KEY) {
    return NextResponse.json({ error: 'Unsplash API key not configured' }, { status: 500 })
  }

  const { photo_id } = await req.json()
  if (!photo_id) return NextResponse.json({ error: 'photo_id required' }, { status: 400 })

  // Fire-and-forget — we don't need to wait for this
  fetch(`https://api.unsplash.com/photos/${photo_id}/download`, {
    headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}

// ── Internal types ────────────────────────────────────────────

interface UnsplashPhoto {
  id: string
  description: string | null
  alt_description: string | null
  urls: { thumb: string; small: string; regular: string }
  user: { name: string; username: string }
}
