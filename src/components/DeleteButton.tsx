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

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm(confirmMsg)) return
    setDeleting(true)
    await fetch(url, { method: 'DELETE' })
    if (onDeleted) onDeleted()
    else router.refresh()
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
      {deleting ? '…' : 'Delete'}
    </button>
  )
}
