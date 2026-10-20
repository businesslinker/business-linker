'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { markMembershipRenewed, markMembershipRenewedBulk } from '../actions'
import Avatar from '../../Avatar'

export default function MembershipPage() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState([])
  const [working, setWorking] = useState(false)
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
    setSelected([])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleRenew(id) {
    const res = await markMembershipRenewed(id)
    if (res.error) { alert(res.error); return }
    load()
  }

  async function handleRenewSelected() {
    if (selected.length === 0) return
    if (!confirm(`Mark ${selected.length} member(s) as renewed? Only do this for members who have paid.`)) return
    setWorking(true)
    const res = await markMembershipRenewedBulk(selected)
    setWorking(false)
    if (res.error) { alert(res.error); return }
    load()
  }

  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>

  const expired = members.filter((m) => (m.membership_paid_through_year || 0) < currentYear)
  const active = members.filter((m) => (m.membership_paid_through_year || 0) >= currentYear)
  const allSelected = expired.length > 0 && selected.length === expired.length

  function toggleOne(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }
  function toggleAll() {
    setSelected(allSelected ? [] : expired.map((m) => m.id))
  }

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold text-gray-900 mb-1">Membership Renewals</h1>
      <p className="text-xs text-gray-400 mb-4">Everyone renews on 1 January. Payment is collected offline (cash) — this just updates their status here.</p>

      {expired.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Expired — Renewal Due ({expired.length})</p>
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-3.5 h-3.5" />
              Select all
            </label>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {expired.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3">
                <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggleOne(m.id)} className="w-4 h-4 shrink-0" />
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

          {selected.length > 0 && (
            <button
              onClick={handleRenewSelected}
              disabled={working}
              className="w-full mt-3 text-sm font-medium text-white bg-green-600 py-2.5 rounded-xl disabled:opacity-50"
            >
              {working ? 'Updating...' : `Renew selected (${selected.length})`}
            </button>
          )}
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Active ({active.length})</p>
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
          {active.length === 0 && <p className="p-3 text-xs text-gray-400">No active members.</p>}
        </div>
      </div>
    </div>
  )
}
