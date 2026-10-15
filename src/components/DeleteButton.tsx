'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  url: string
  confirm: string
  onDeleted?: () => void
}

export default function DeleteButton({ url, confirm: confirmMsg, onDeleted }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const archives = /\/(lessons|pages|assessments)\/[^/]+$/.test(url)

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm(archives ? 'Archive this item? Its learning records will be preserved.' : confirmMsg)) return
    setDeleting(true)
    try {
      const res = await fetch(url, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Unable to save change')
      if (onDeleted) onDeleted()
      else router.refresh()
    } catch (error) { window.alert(error instanceof Error ? error.message : 'Unable to save change') }
    finally { setDeleting(false) }
  }

  return (
    <button
      onClick={handleClick}
      disabled={deleting}
      className="btn btn-sm"
      style={{
        background: 'var(--danger-bg)',
        color: 'var(--danger)',
        border: 'none',
        opacity: deleting ? 0.6 : 1,
      }}
    >
      {deleting ? '…' : archives ? 'Archive' : 'Delete'}
    </button>
  )
}
