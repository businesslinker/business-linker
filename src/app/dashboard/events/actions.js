'use server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'

export async function createEvent(formData) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: caller } = await supabase.from('profiles').select('role, chapter_id').eq('id', user.id).single()
  if (!caller || (caller.role !== 'super_admin' && caller.role !== 'local_admin')) {
    return { error: 'Not authorized' }
  }

  const chapterId = caller.role === 'super_admin' ? formData.get('chapterId') : caller.chapter_id
  if (!chapterId) return { error: 'Chapter required' }

  const { data: event, error } = await admin.from('events').insert({
    chapter_id: chapterId,
    title: formData.get('title'),
    description: formData.get('description'),
    event_date: formData.get('eventDate'),
    venue: formData.get('venue'),
    created_by: user.id,
  }).select().single()

  if (error) return { error: error.message }

  if (caller.role === 'local_admin') {
    await admin.from('activity_log').insert({
      actor_id: user.id,
      action_type: 'event_created',
      reference_id: event.id,
      chapter_id: chapterId,
      description: `Created event "${formData.get('title')}"`,
    })
  }

  revalidatePath('/dashboard/events')
  return { success: true }
}

export async function markAttendance(eventId, formData) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: event } = await supabase.from('events').select('chapter_id').eq('id', eventId).single()
  const { data: caller } = await supabase.from('profiles').select('role, chapter_id').eq('id', user.id).single()

  const authorized = caller?.role === 'super_admin' || (caller?.role === 'local_admin' && caller.chapter_id === event?.chapter_id)
  if (!authorized) return { error: 'Not authorized' }

  const memberIds = formData.getAll('attended')
  const { data: chapterMembers } = await supabase
    .from('profiles')
    .select('id')
    .eq('chapter_id', event.chapter_id)
    .eq('role', 'member')
    .eq('status', 'approved')

  const rows = (chapterMembers || []).map((m) => ({
    event_id: eventId,
    member_id: m.id,
    attended: memberIds.includes(m.id),
    marked_by: user.id,
    marked_at: new Date().toISOString(),
  }))

  if (rows.length > 0) {
    const { error } = await admin.from('attendance').upsert(rows, { onConflict: 'event_id,member_id' })
    if (error) return { error: error.message }
  }

  revalidatePath(`/dashboard/events/${eventId}`)
  return { success: true }
}
