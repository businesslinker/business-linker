'use server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'

async function getCaller() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('id, role, chapter_id').eq('id', user.id).single()
  return data
}

function canManageChapter(caller, chapterId) {
  return caller?.role === 'super_admin' || (caller?.role === 'local_admin' && caller.chapter_id === chapterId)
}

async function logActivity(admin, caller, actionType, referenceId, chapterId, description) {
  if (caller.role !== 'local_admin') return
  await admin.from('activity_log').insert({
    actor_id: caller.id,
    action_type: actionType,
    reference_id: referenceId,
    chapter_id: chapterId,
    description,
  })
}

// eventDate must be a full ISO string (the form converts the local time before sending)
export async function createEvent(formData) {
  const caller = await getCaller()
  if (!caller || (caller.role !== 'super_admin' && caller.role !== 'local_admin')) {
    return { error: 'Not authorized' }
  }
  const admin = createAdminClient()

  const chapterId = caller.role === 'super_admin' ? formData.get('chapterId') : caller.chapter_id
  if (!chapterId) return { error: 'Chapter required' }

  const { data: event, error } = await admin.from('events').insert({
    chapter_id: chapterId,
    title: formData.get('title'),
    description: formData.get('description'),
    event_date: formData.get('eventDate'),
    venue: formData.get('venue'),
    created_by: caller.id,
  }).select().single()

  if (error) return { error: error.message }

  await logActivity(admin, caller, 'event_created', event.id, chapterId, `Created event "${formData.get('title')}"`)

  revalidatePath('/dashboard/events')
  return { success: true }
}

export async function updateEvent(eventId, formData) {
  const caller = await getCaller()
  if (!caller) return { error: 'Not authorized' }
  const admin = createAdminClient()

  const { data: event } = await admin.from('events').select('chapter_id').eq('id', eventId).single()
  if (!event) return { error: 'Event not found' }
  if (!canManageChapter(caller, event.chapter_id)) return { error: 'Not authorized' }

  const { error } = await admin.from('events').update({
    title: formData.get('title'),
    description: formData.get('description'),
    event_date: formData.get('eventDate'),
    venue: formData.get('venue'),
  }).eq('id', eventId)

  if (error) return { error: error.message }

  await logActivity(admin, caller, 'event_updated', eventId, event.chapter_id, `Edited event "${formData.get('title')}"`)

  revalidatePath('/dashboard/events')
  revalidatePath(`/dashboard/events/${eventId}`)
  return { success: true }
}

export async function deleteEvent(eventId) {
  const caller = await getCaller()
  if (!caller) return { error: 'Not authorized' }
  const admin = createAdminClient()

  const { data: event } = await admin.from('events').select('chapter_id, title').eq('id', eventId).single()
  if (!event) return { error: 'Event not found' }
  if (!canManageChapter(caller, event.chapter_id)) return { error: 'Not authorized' }

  // RSVPs and attendance for this event are removed with it
  const { error } = await admin.from('events').delete().eq('id', eventId)
  if (error) return { error: error.message }

  await logActivity(admin, caller, 'event_deleted', eventId, event.chapter_id, `Deleted event "${event.title}"`)

  revalidatePath('/dashboard/events')
  return { success: true }
}

export async function markAttendance(eventId, formData) {
  const caller = await getCaller()
  if (!caller) return { error: 'Not authorized' }
  const admin = createAdminClient()

  const { data: event } = await admin.from('events').select('chapter_id').eq('id', eventId).single()
  if (!event) return { error: 'Event not found' }
  if (!canManageChapter(caller, event.chapter_id)) return { error: 'Not authorized' }

  const attendedIds = formData.getAll('attended')
  const { data: chapterMembers } = await admin
    .from('profiles')
    .select('id')
    .eq('chapter_id', event.chapter_id)
    .in('role', ['member', 'local_admin'])
    .eq('status', 'approved')

  const rows = (chapterMembers || []).map((m) => ({
    event_id: eventId,
    member_id: m.id,
    attended: attendedIds.includes(m.id),
    marked_by: caller.id,
    marked_at: new Date().toISOString(),
  }))

  if (rows.length > 0) {
    const { error } = await admin.from('attendance').upsert(rows, { onConflict: 'event_id,member_id' })
    if (error) return { error: error.message }
  }

  revalidatePath(`/dashboard/events/${eventId}`)
  return { success: true }
}
