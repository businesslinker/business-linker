'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Avatar from '../../Avatar'
import { ChevronRight } from 'lucide-react'

export default function ManageMembersPage() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, photo_url, role, business_name, profession, chapters!profiles_chapter_id_fkey ( city_name )')
        .eq('status', 'approved')
        .neq('role', 'super_admin')
        .order('full_name')
      setMembers(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return members
    const q = query.toLowerCase()
    return members.filter((m) =>
      m.full_name?.toLowerCase().includes(q) ||
      m.business_name?.toLowerCase().includes(q) ||
      m.chapters?.city_name?.toLowerCase().includes(q)
    )
  }, [members, query])

  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold text-gray-900 mb-1">Manage Members</h1>
      <p className="text-xs text-gray-400 mb-3">{members.length} approved members. Tap one to edit details, change chapter or remove.</p>

      <input
        type="text"
        placeholder="Search by name, business or city..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full border border-gray-200 p-3 rounded-xl mb-4 text-sm"
      />

      <div className="space-y-2">
        {filtered.map((m) => (
          <Link key={m.id} href={`/dashboard/admin/members/${m.id}`} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3">
            <Avatar name={m.full_name} photoUrl={m.photo_url} size={40} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                {m.full_name}
                {m.role === 'local_admin' && <span className="ml-1.5 text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-full">Local Admin</span>}
              </p>
              <p className="text-xs text-gray-500 truncate">{m.business_name} · {m.profession}</p>
              <p className="text-[11px] text-gray-400">{m.chapters?.city_name}</p>
            </div>
            <ChevronRight size={16} className="text-gray-300 shrink-0" />
          </Link>
        ))}
        {filtered.length === 0 && <p className="text-center text-gray-400 text-sm py-8">No members found.</p>}
      </div>
    </div>
  )
}
