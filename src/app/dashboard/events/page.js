'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Plus } from 'lucide-react'

export default function EventsPage() {
  const [events, setEvents] = useState([])
  const [rsvpMap, setRsvpMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState('member')
  const [userId, setUserId] = useState(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user.id)

    const { data: me } = await supabase.from('profiles').select('role, chapter_id').eq('id', user.id).single()
    setRole(me.role)

    let query = supabase.from('events').select('*, chapters!events_chapter_id_fkey ( city_name )').order('event_date', { ascending: true })
    if (me.role !== 'super_admin') query = query.eq('chapter_id', me.chapter_id)

    const { data: eventsData } = await query
    setEvents(eventsData || [])

    const { data: myRsvps } = await supabase.from('rsvps').select('event_id, status').eq('member_id', user.id)
    setRsvpMap(Object.fromEntries((myRsvps || []).map((r) => [r.event_id, r.status])))

    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function rsvp(eventId, status) {
    const supabase = createClient()
    await supabase.from('rsvps').upsert(
      { event_id: eventId, member_id: userId, status, responded_at: new Date().toISOString() },
      { onConflict: 'event_id,member_id' }
    )
    setRsvpMap((r) => ({ ...r, [eventId]: status }))
  }

  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">Loading events...</div>

  const isAdmin = role === 'super_admin' || role === 'local_admin'
  const now = new Date()
  const upcoming = events.filter((e) => new Date(e.event_date) >= now)
  const past = events.filter((e) => new Date(e.event_date) < now)

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Events</h1>
        {isAdmin && (
          <Link href="/dashboard/events/new" className="flex items-center gap-1 text-xs font-medium text-white bg-blue-700 px-3 py-2 rounded-lg">
            <Plus size={14} /> New Event
          </Link>
        )}
      </div>

      <div className="space-y-3">
        {upcoming.map((e) => (
          <div key={e.id} className="bg-white border border-gray-200 rounded-xl p-3.5">
            <Link href={`/dashboard/events/${e.id}`}>
              <p className="text-sm font-semibold text-gray-900">{e.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {role === 'super_admin' && `${e.chapters?.city_name} · `}
                {new Date(e.event_date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
              {e.venue && <p className="text-xs text-gray-400">{e.venue}</p>}
              {e.description && <p className="text-xs text-gray-600 mt-1.5">{e.description}</p>}
            </Link>
            {role === 'member' || role === 'local_admin' ? (
              <div className="flex gap-1.5 mt-3">
                {['going', 'maybe', 'not_going'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => rsvp(e.id, opt)}
                    className={`text-[11px] font-medium px-2.5 py-1.5 rounded-lg flex-1 ${
                      rsvpMap[e.id] === opt ? 'bg-blue-700 text-white' : 'bg-gray-50 text-gray-600'
                    }`}
                  >
                    {opt === 'going' ? 'Going' : opt === 'maybe' ? 'Maybe' : "Can't Go"}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        {upcoming.length === 0 && <p className="text-center text-gray-400 text-sm py-6">No upcoming events.</p>}
      </div>

      {past.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 mt-2">Past Events</p>
          <div className="space-y-2">
            {past.map((e) => (
              <Link key={e.id} href={`/dashboard/events/${e.id}`} className="block bg-white border border-gray-200 rounded-xl p-3 opacity-70">
                <p className="text-sm font-medium text-gray-700">{e.title}</p>
                <p className="text-xs text-gray-400">{new Date(e.event_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
