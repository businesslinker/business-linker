'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { approveProfileChange, rejectProfileChange } from '../actions'
import Avatar from '../../Avatar'
import { Check, X } from 'lucide-react'

export default function ProfileChangesPage() {
  const [changes, setChanges] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const supabase = createClient()
    const { data } = await supabase
      .from('pending_profile_changes')
      .select('*, profiles ( full_name, photo_url, business_name, profession, business_category )')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    setChanges(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleApprove(id) {
    const res = await approveProfileChange(id)
    if (res.error) { alert(res.error); return }
    load()
  }
  async function handleReject(id) {
    const res = await rejectProfileChange(id)
    if (res.error) { alert(res.error); return }
    load()
  }

  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold text-gray-900 mb-1">Profile Change Requests</h1>
      <p className="text-xs text-gray-400 mb-4">Business Name / Profession / Category edits — ek chapter mein ek category ka khayal rakhein.</p>

      <div className="space-y-3">
        {changes.map((c) => (
          <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-3.5">
            <div className="flex items-center gap-2.5 mb-3">
              <Avatar name={c.profiles?.full_name} photoUrl={c.profiles?.photo_url} size={36} />
              <p className="text-sm font-semibold text-gray-900">{c.profiles?.full_name}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-gray-400 mb-1">Current</p>
                <p className="text-gray-700">{c.profiles?.business_name}</p>
                <p className="text-gray-700">{c.profiles?.profession}</p>
                <p className="text-gray-700">{c.profiles?.business_category}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Requested</p>
                <p className="text-blue-700 font-medium">{c.requested_business_name}</p>
                <p className="text-blue-700 font-medium">{c.requested_profession}</p>
                <p className="text-blue-700 font-medium">{c.requested_business_category}</p>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <button onClick={() => handleApprove(c.id)} className="flex-1 flex items-center justify-center gap-1 text-xs font-medium py-2 rounded-lg text-white bg-green-600">
                <Check size={13} /> Approve
              </button>
              <button onClick={() => handleReject(c.id)} className="flex-1 flex items-center justify-center gap-1 text-xs font-medium py-2 rounded-lg text-red-600 bg-white border border-red-200">
                <X size={13} /> Reject
              </button>
            </div>
          </div>
        ))}
        {changes.length === 0 && <p className="text-center text-gray-400 text-sm py-8">Koi pending request nahi hai.</p>}
      </div>
    </div>
  )
}
