'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { createEvent } from '../actions'

export default function NewEventPage() {
  const [role, setRole] = useState(null)
  const [chapters, setChapters] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setRole(me.role)
      if (me.role === 'super_admin') {
        const { data } = await supabase.from('chapters').select('id, city_name').order('city_name')
        setChapters(data || [])
      }
    }
    load()
  }, [])

  async function handleSubmit(formData) {
    setLoading(true)
    setError('')
    const res = await createEvent(formData)
    setLoading(false)
    if (res.error) { setError(res.error); return }
    router.push('/dashboard/events')
    router.refresh()
  }

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold text-gray-900 mb-4">Create Event</h1>
      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
      <form action={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        {role === 'super_admin' && (
          <select name="chapterId" className="w-full border border-gray-200 p-2.5 rounded-lg text-sm" required>
            <option value="">-- Select Chapter --</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>{c.city_name}</option>
            ))}
          </select>
        )}
        <input name="title" placeholder="Event Title" className="w-full border border-gray-200 p-2.5 rounded-lg text-sm" required />
        <textarea name="description" placeholder="Description" rows={3} className="w-full border border-gray-200 p-2.5 rounded-lg text-sm" />
        <input name="eventDate" type="datetime-local" className="w-full border border-gray-200 p-2.5 rounded-lg text-sm" required />
        <input name="venue" placeholder="Venue" className="w-full border border-gray-200 p-2.5 rounded-lg text-sm" />
        <button disabled={loading} className="w-full bg-blue-700 text-white p-2.5 rounded-lg font-medium disabled:opacity-50">
          {loading ? 'Creating...' : 'Create Event'}
        </button>
      </form>
    </div>
  )
}
