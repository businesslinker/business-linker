// Supabase Edge Function: send-reminders
// Deploy: supabase functions deploy send-reminders
// Schedule: pg_cron se roz ek baar chalayein (README dekhein)
//
// Ye function karta hai:
// 1. Membership renewal reminder — 15 din pehle aur 3 din pehle 1 January se
//    (sabhi members/local admins ke liye jinka membership_paid_through_year
//    aane wale January se pehle ka hai)
// 2. Event reminder — event se 24 ghante pehle, us chapter ke members ko
// Har reminder "reminder_log" mein record hota hai taaki dobara na bheje.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function sendEmail(to, subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Business Linker <onboarding@resend.dev>', // apna verified domain use karein production mein
      to, subject, html,
    }),
  })
  return res.ok
}

async function alreadySent(reminderType, referenceId, memberId) {
  const { data } = await supabase
    .from('reminder_log')
    .select('id')
    .eq('reminder_type', reminderType)
    .eq('reference_id', referenceId)
    .eq('member_id', memberId)
    .maybeSingle()
  return !!data
}

async function logReminder(reminderType, referenceId, memberId, channel) {
  await supabase.from('reminder_log').insert({ reminder_type: reminderType, reference_id: referenceId, member_id: memberId, channel })
}

Deno.serve(async () => {
  const results = { membership15: 0, membership3: 0, events: 0 }
  const now = new Date()

  // ---- Membership renewal reminders (fixed 1 January cycle) ----
  const thisJan1 = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
  const nextJan1 = now.getTime() <= thisJan1.getTime()
    ? thisJan1
    : new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1))
  const daysUntilJan1 = Math.round((nextJan1.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const dueYear = nextJan1.getUTCFullYear()

  if (daysUntilJan1 === 15 || daysUntilJan1 === 3) {
    const reminderType = daysUntilJan1 === 15 ? 'membership_15day' : 'membership_3day'

    const { data: dueMembers } = await supabase
      .from('profiles')
      .select('id, full_name, email, membership_paid_through_year')
      .in('role', ['member', 'local_admin'])
      .eq('status', 'approved')
      .lt('membership_paid_through_year', dueYear)

    for (const m of dueMembers || []) {
      if (!m.email) continue
      const sent = await alreadySent(reminderType, `jan1-${dueYear}`, m.id)
      if (sent) continue

      const ok = await sendEmail(
        m.email,
        `Membership Renewal Reminder — ${daysUntilJan1} din baaki hain`,
        `<p>Namaste ${m.full_name},</p>
         <p>Aapki Business Linker membership <b>1 January ${dueYear}</b> ko renew honi hai (${daysUntilJan1} din baaki hain).</p>
         <p>Renewal ke liye apne Super Admin se sampark karein.</p>`
      )
      if (ok) {
        await logReminder(reminderType, `jan1-${dueYear}`, m.id, 'email')
        if (daysUntilJan1 === 15) results.membership15++
        else results.membership3++
      }
    }
  }

  // ---- Event reminders (agle 24 ghante mein hone wale events) ----
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const { data: upcomingEvents } = await supabase
    .from('events')
    .select('id, title, event_date, venue, chapter_id')
    .gte('event_date', now.toISOString())
    .lte('event_date', in24h.toISOString())

  for (const event of upcomingEvents || []) {
    const { data: members } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('chapter_id', event.chapter_id)
      .eq('status', 'approved')
      .in('role', ['member', 'local_admin'])

    for (const member of members || []) {
      if (!member.email) continue
      const sent = await alreadySent('event_reminder', event.id, member.id)
      if (sent) continue

      const ok = await sendEmail(
        member.email,
        `Event Reminder: ${event.title}`,
        `<p>Namaste ${member.full_name},</p>
         <p><b>${event.title}</b> kal hone wala hai${event.venue ? ` (${event.venue})` : ''}.</p>
         <p>Please attend karein!</p>`
      )
      if (ok) {
        await logReminder('event_reminder', event.id, member.id, 'email')
        results.events++
      }
    }
  }

  return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } })
})
