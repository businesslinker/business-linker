'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { approveMember, rejectMember } from '../actions'
import Avatar from '../../Avatar'
import { Check, X, ChevronRight } from 'lucide-react'

export default function RequestsPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: me } = await supabase.from('profiles').select('role, chapter_id').eq('id', user.id).single()

    let query = supabase
      .from('profiles')
      .select('id, full_name, photo_url, age, business_name, profession, business_category, bio, chapters!profiles_chapter_id_fkey ( city_name )')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (me.role === 'local_admin') query = query.eq('chapter_id', me.chapter_id)

    const { data } = await query
    setRequests(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleApprove(id) {
    const res = await approveMember(id)
    if (res.error) { alert(res.error); return }
    load()
  }
  async function handleReject(id) {
    if (!confirm('Ye request reject kar dein?')) return
    const res = await rejectMember(id)
    if (res.error) { alert(res.error); return }
    load()
  }

  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold text-gray-900 mb-4">
        Pending Member Requests {requests.length > 0 && <span className="text-sm font-normal text-gray-400">({requests.length})</span>}
      </h1>

      <div className="space-y-3">
        {requests.map((r) => (
          <div key={r.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <Link href={`/dashboard/directory/${r.id}`} className="flex items-center gap-2.5 p-3.5 active:bg-gray-50">
              <Avatar name={r.full_name} photoUrl={r.photo_url} size={44} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{r.full_name}{r.age ? `, ${r.age}` : ''}</p>
                <p className="text-xs text-gray-500">{r.business_name} · {r.profession}</p>
                <p className="text-[11px] text-gray-400">{r.chapters?.city_name} · {r.business_category}</p>
              </div>
              <span className="text-[11px] text-blue-700 font-medium flex items-center gap-0.5 shrink-0">
                View Profile <ChevronRight size={13} />
              </span>
            </Link>

            {r.bio && <p className="text-xs text-gray-600 px-3.5 pb-2 -mt-1">{r.bio}</p>}

            <div className="flex gap-2 px-3.5 pb-3.5">
              <button onClick={() => handleApprove(r.id)} className="flex-1 flex items-center justify-center gap-1 text-xs font-medium py-2 rounded-lg text-white bg-green-600">
                <Check size={13} /> Approve
              </button>
              <button onClick={() => handleReject(r.id)} className="flex-1 flex items-center justify-center gap-1 text-xs font-medium py-2 rounded-lg text-red-600 bg-white border border-red-200">
                <X size={13} /> Reject
              </button>
            </div>
          </div>
        ))}
        {requests.length === 0 && <p className="text-center text-gray-400 text-sm py-8">Koi pending request nahi hai.</p>}
      </div>
    </div>
  )
}