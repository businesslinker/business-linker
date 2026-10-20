import { createClient } from '@/lib/supabase-server'
import { markAttendance } from '../actions'
import Link from 'next/link'
import Avatar from '../../Avatar'
import DeleteEventButton from './DeleteEventButton'
import { ChevronLeft, Pencil } from 'lucide-react'

export default async function EventDetailPage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: event } = await supabase.from('events').select('*, chapters!events_chapter_id_fkey ( city_name )').eq('id', id).single()
  if (!event) return <div className="p-8 text-center text-gray-400 text-sm">Event not found.</div>

  const { data: me } = await supabase.from('profiles').select('role, chapter_id').eq('id', user.id).single()
  const canManage = me.role === 'super_admin' || (me.role === 'local_admin' && me.chapter_id === event.chapter_id)

  const { data: chapterMembers } = await supabase
    .from('profiles')
    .select('id, full_name, photo_url, business_name, role')
    .eq('chapter_id', event.chapter_id)
    .in('role', ['member', 'local_admin'])
    .eq('status', 'approved')
    .order('full_name')

  const { data: rsvps } = await supabase.from('rsvps').select('member_id, status').eq('event_id', id)
  const { data: attendance } = await supabase.from('attendance').select('member_id, attended').eq('event_id', id)

  const rsvpMap = Object.fromEntries((rsvps || []).map((r) => [r.member_id, r.status]))
  const attendanceMap = Object.fromEntries((attendance || []).map((a) => [a.member_id, a.attended]))
  const goingCount = (rsvps || []).filter((r) => r.status === 'going').length

  async function handleAttendance(formData) {
    'use server'
    await markAttendance(id, formData)
  }

  return (
    <div>
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <Link href="/dashboard/events" className="inline-flex items-center gap-1 text-xs font-medium text-blue-700">
          <ChevronLeft size={15} /> Back
        </Link>
        {canManage && (
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/events/${id}/edit`} className="flex items-center gap-1 text-xs font-medium text-blue-700 bg-white border border-blue-200 px-3 py-1.5 rounded-lg">
              <Pencil size={13} /> Edit
            </Link>
            <DeleteEventButton eventId={id} />
          </div>
        )}
      </div>

      <div className="px-4">
        <h1 className="text-xl font-bold text-gray-900">{event.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{event.chapters?.city_name}</p>
        <p className="text-sm text-gray-500">
          {new Date(event.event_date).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}
        </p>
        {event.venue && <p className="text-sm text-gray-500">{event.venue}</p>}
        {event.description && <p className="text-sm text-gray-700 mt-2">{event.description}</p>}

        <div className="bg-blue-50 rounded-xl p-4 my-5">
          <p className="text-xs text-blue-700">RSVP &quot;Going&quot;</p>
          <p className="text-2xl font-bold text-blue-900">{goingCount} / {chapterMembers?.length || 0}</p>
        </div>

        {canManage && (
          <>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Attendance</h2>
            <form action={handleAttendance} className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 mb-6">
              {chapterMembers?.map((m) => (
                <label key={m.id} className="flex items-center gap-3 p-3 cursor-pointer">
                  <input type="checkbox" name="attended" value={m.id} defaultChecked={!!attendanceMap[m.id]} className="w-4 h-4" />
                  <Avatar name={m.full_name} photoUrl={m.photo_url} size={32} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      {m.full_name}
                      {m.role === 'local_admin' && <span className="ml-1.5 text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-full">Local Admin</span>}
                    </p>
                    <p className="text-xs text-gray-400">{m.business_name}</p>
                  </div>
                  <span className={`text-[11px] ${rsvpMap[m.id] === 'going' ? 'text-green-600' : rsvpMap[m.id] === 'not_going' ? 'text-red-500' : 'text-gray-400'}`}>
                    {rsvpMap[m.id] ? rsvpMap[m.id].replace('_', ' ') : 'no response'}
                  </span>
                </label>
              ))}
              <div className="p-3">
                <button className="w-full bg-blue-700 text-white p-2 rounded-lg text-sm font-medium">Save Attendance</button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
