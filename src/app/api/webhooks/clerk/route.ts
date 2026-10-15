// POST /api/webhooks/clerk
//
// Clerk calls this endpoint when a user signs up, updates their profile,
// or deletes their account. We use it to keep our `users` table in sync.
//
// Setup in Clerk Dashboard → Webhooks → Add endpoint:
//   URL:    https://yourdomain.com/api/webhooks/clerk
//   Events: user.created, user.updated, user.deleted

import { headers } from 'next/headers'
import { Webhook } from 'svix'
import { createServiceClient } from '@/lib/supabase'

interface ClerkUserPayload {
  id: string
  email_addresses: { email_address: string; id: string }[]
  primary_email_address_id: string
  first_name: string | null
  last_name: string | null
  image_url: string | null
}

export async function POST(req: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET

  if (!webhookSecret) {
    return new Response('CLERK_WEBHOOK_SECRET not set', { status: 500 })
  }

  // Verify the webhook signature using svix
  const headerPayload = await headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing svix headers', { status: 400 })
  }

  const payload = await req.text()

  let event: { type: string; data: ClerkUserPayload }
  try {
    const wh = new Webhook(webhookSecret)
    event = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as typeof event
  } catch {
    return new Response('Invalid webhook signature', { status: 400 })
  }

  const supabase = createServiceClient()
  const data = event.data

  // Helper: get primary email from Clerk payload
  const getPrimaryEmail = (user: ClerkUserPayload) => {
    const primary = user.email_addresses.find(
      (e) => e.id === user.primary_email_address_id
    )
    return primary?.email_address ?? user.email_addresses[0]?.email_address
  }

  switch (event.type) {
    case 'user.created': {
      const email = getPrimaryEmail(data)
      if (!email) {
        return new Response('No email found on user', { status: 400 })
      }

      const { error } = await supabase.from('users').upsert({
        clerk_id: data.id,
        email,
        full_name: [data.first_name, data.last_name].filter(Boolean).join(' ') || null,
        avatar_url: data.image_url ?? null,
        role: 'student', // Existing accounts are not overwritten on redelivery.
      }, { onConflict: 'clerk_id', ignoreDuplicates: true })

      if (error) {
        console.error('Failed to create user:', error)
        return new Response(`Failed to create user: ${error.message} (code: ${error.code})`, { status: 500 })
      }
      break
    }

    case 'user.updated': {
      const email = getPrimaryEmail(data)
      if (!email) break

      const { error } = await supabase
        .from('users')
        .update({
          email,
          full_name: [data.first_name, data.last_name].filter(Boolean).join(' ') || null,
          avatar_url: data.image_url ?? null,
        })
        .eq('clerk_id', data.id)

      if (error) {
        console.error('Failed to update user:', error)
        return new Response('Failed to update user', { status: 500 })
      }
      break
    }

    case 'user.deleted': {
      // Deleting the user cascades to enrollments, progress, etc.
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('clerk_id', data.id)

      if (error) {
        console.error('Failed to delete user:', error)
        return new Response('Failed to delete user', { status: 500 })
      }
      break
    }

    default:
      // Ignore other event types
      break
  }

  return new Response('OK', { status: 200 })
}
