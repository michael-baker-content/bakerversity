const widths = [320, 640, 960, 1280, 1600, 2000, 2400]

/** Responsive delivery for trusted public image sources; other URLs stay direct. */
export function imageDelivery(src, sizes = '(max-width: 720px) calc(100vw - 48px), 900px') {
  try {
    const url = new URL(src)
    if (url.protocol !== 'https:' || url.username || url.password) return { src }
    let sized
    if (url.hostname === 'images.unsplash.com') {
      sized = width => {
        const next = new URL(url)
        next.searchParams.set('auto', 'format')
        next.searchParams.set('w', String(width))
        next.searchParams.set('q', '80')
        return next.toString()
      }
    } else {
      const storage = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (!storage || url.origin !== new URL(storage).origin || !url.pathname.startsWith('/storage/v1/object/public/lesson-images/') || /\.(gif|svg)$/i.test(url.pathname)) return { src }
      sized = width => `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`
    }
    return { src: sized(960), srcSet: widths.map(width => `${sized(width)} ${width}w`).join(', '), sizes }
  } catch { return { src } }
}
