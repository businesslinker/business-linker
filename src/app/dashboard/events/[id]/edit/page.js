'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { updateEvent } from '../../actions'
import { ChevronLeft } from 'lucide-react'

// Turns a stored UTC timestamp into the value a datetime-local input expects, in the user's own timezone
function toLocalInputValue(iso) {
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function EditEventPage() {
  const { id } = useParams()
  const router = useRouter()
  const [event, setEvent] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.from('events').select('*').eq('id', id).single()
      setEvent(data)
    }
    load()
  }, [id])

  async function handleSubmit(formData) {
    setLoading(true)
    setError('')
    formData.set('eventDate', new Date(formData.get('eventDate')).toISOString())
    const res = await updateEvent(id, formData)
    setLoading(false)
    if (res?.error) { setError(res.error); return }
    router.push(`/dashboard/events/${id}`)
    router.refresh()
  }

  if (!event) return <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>

  return (
    <div className="p-4">
      <Link href={`/dashboard/events/${id}`} className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 mb-3">
        <ChevronLeft size={15} /> Back
      </Link>
      <h1 className="text-lg font-bold text-gray-900 mb-4">Edit Event</h1>
      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
      <form action={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <input name="title" defaultValue={event.title} placeholder="Event Title" className="w-full border border-gray-200 p-2.5 rounded-lg text-sm" required />
        <textarea name="description" defaultValue={event.description || ''} placeholder="Description" rows={3} className="w-full border border-gray-200 p-2.5 rounded-lg text-sm" />
        <input name="eventDate" type="datetime-local" defaultValue={toLocalInputValue(event.event_date)} className="w-full border border-gray-200 p-2.5 rounded-lg text-sm" required />
        <input name="venue" defaultValue={event.venue || ''} placeholder="Venue" className="w-full border border-gray-200 p-2.5 rounded-lg text-sm" />
        <button disabled={loading} className="w-full bg-blue-700 text-white p-2.5 rounded-lg font-medium disabled:opacity-50">
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
