'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'

export default function ContactForm({ endpoint }: { endpoint: string | null }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')
  const pending = useRef(false)
  if (!endpoint) return <div className="contact-notice" role="status">The contact form is not available yet. Please check back soon.</div>
  return <form className="contact-form" action={endpoint} method="POST" onSubmit={async event => {
    event.preventDefault()
    if (pending.current) return
    const form = event.currentTarget
    const data = new FormData(form)
    pending.current = true; setState('sending'); setError('')
    try {
      const response = await fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(30000) })
      if (!response.ok) {
        const result = await response.json().catch(() => null)
        const messages = Array.isArray(result?.errors) ? result.errors.map((item: { message?: string }) => item.message).filter(Boolean).join(' ') : ''
        setError(messages || 'The form could not be submitted. Your message is still here; please try again later.')
        setState('error'); return
      }
      form.reset(); setState('sent')
    } catch {
      setError('We could not confirm delivery. Your message is still here. Please check your connection before trying again; the earlier message may have arrived.')
      setState('error')
    } finally { pending.current = false }
  }}>
    <fieldset disabled={state === 'sending'}>
      <legend className="sr-only">Contact Michael</legend>
      <label>Your name (optional)<input className="input" name="name" autoComplete="name" maxLength={120} /></label>
      <label>Your email<input className="input" type="email" name="email" autoComplete="email" required maxLength={254} /></label>
      <label>What is this about?<select className="input" name="topic" defaultValue="Question"><option>Question</option><option>Content correction</option><option>Accessibility issue</option><option>Privacy request</option><option>Permission to reuse materials</option><option>Other</option></select></label>
      <label>Page link (optional)<input className="input" type="url" name="page_url" placeholder="https://bakerversity.vercel.app/..." maxLength={2000} /></label>
      <label>Your message<textarea className="input" name="message" rows={7} required minLength={10} maxLength={10000} /></label>
      <input type="hidden" name="_subject" value="Bakerversity contact form" />
      <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ display: 'none' }} />
      <p className="contact-hint">Your email is used to reply to your message. Formspree handles delivery. Please do not include passwords or sensitive personal information. <Link href="/privacy">Privacy information</Link></p>
      <button className="btn btn-primary" type="submit">{state === 'sending' ? 'Sending…' : 'Send message'}</button>
    </fieldset>
    <p role="status" aria-atomic="true">{state === 'sending' ? 'Sending your message…' : state === 'sent' ? 'Thank you. Your message has been submitted.' : ''}</p>
    <p role="alert" aria-atomic="true">{state === 'error' ? error : ''}</p>
  </form>
}
