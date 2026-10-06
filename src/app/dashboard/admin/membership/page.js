'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { markMembershipRenewed } from '../actions'
import Avatar from '../../Avatar'

export default function MembershipPage() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const currentYear = new Date().getFullYear()

  async function load() {
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, photo_url, membership_paid_through_year, chapters!profiles_chapter_id_fkey ( city_name )')
      .eq('status', 'approved')
      .in('role', ['member', 'local_admin'])
      .order('full_name')
    setMembers(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleRenew(id) {
    const res = await markMembershipRenewed(id)
    if (res.error) { alert(res.error); return }
    load()
  }

  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>

  const expired = members.filter((m) => (m.membership_paid_through_year || 0) < currentYear)
  const active = members.filter((m) => (m.membership_paid_through_year || 0) >= currentYear)

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold text-gray-900 mb-1">Membership Renewals</h1>
      <p className="text-xs text-gray-400 mb-4">Sab members 1 January ko renew hote hain. Cash offline liya jaata hai, yahan sirf status update karein.</p>

      {expired.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Expired — Renewal Due</p>
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {expired.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3">
                <Avatar name={m.full_name} photoUrl={m.photo_url} size={34} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{m.full_name}</p>
                  <p className="text-xs text-gray-400">{m.chapters?.city_name}</p>
                </div>
                <button onClick={() => handleRenew(m.id)} className="text-[11px] font-medium text-white bg-blue-700 px-3 py-1.5 rounded-lg">
                  Mark Renewed
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Active</p>
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {active.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-3">
              <Avatar name={m.full_name} photoUrl={m.photo_url} size={34} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{m.full_name}</p>
                <p className="text-xs text-gray-400">{m.chapters?.city_name} · valid through {m.membership_paid_through_year}</p>
              </div>
              <button onClick={() => handleRenew(m.id)} className="text-[11px] font-medium text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg">
                Renew Early
              </button>
            </div>
          ))}
          {active.length === 0 && <p className="p-3 text-xs text-gray-400">Koi active member nahi hai.</p>}
        </div>
      </div>
    </div>
  )
}
