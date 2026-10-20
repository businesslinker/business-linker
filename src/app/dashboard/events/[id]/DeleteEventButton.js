'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { deleteEvent } from '../actions'

export default function DeleteEventButton({ eventId }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (!confirm('Delete this event? Its RSVPs and attendance will be removed too.')) return
    setLoading(true)
    const res = await deleteEvent(eventId)
    if (res?.error) {
      alert(res.error)
      setLoading(false)
      return
    }
    router.push('/dashboard/events')
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="flex items-center gap-1 text-xs font-medium text-red-600 bg-white border border-red-200 px-3 py-1.5 rounded-lg disabled:opacity-50"
    >
      <Trash2 size={13} /> {loading ? 'Deleting...' : 'Delete'}
    </button>
  )
}
