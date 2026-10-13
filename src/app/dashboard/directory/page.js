'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Avatar from '../Avatar'
import ContactButtons from '../ContactButtons'

export default function DirectoryPage() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, photo_url, business_name, profession, business_category, phone, whatsapp, chapters!profiles_chapter_id_fkey ( city_name )')
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
      m.profession?.toLowerCase().includes(q) ||
      m.business_category?.toLowerCase().includes(q) ||
      m.chapters?.city_name?.toLowerCase().includes(q)
    )
  }, [members, query])

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold text-gray-900 mb-1">Member Directory</h1>
      <p className="text-xs text-gray-400 mb-3">Search members across every chapter</p>

      <input
        type="text"
        placeholder="Search by name, business, profession, city..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full border border-gray-200 p-3 rounded-xl mb-4 text-sm"
      />

      {loading && <p className="text-gray-400 text-sm text-center py-8">Loading...</p>}

      <div className="space-y-2">
        {filtered.map((m) => (
          <div
            key={m.id}
            onClick={() => router.push(`/dashboard/directory/${m.id}`)}
            className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3 cursor-pointer"
          >
            <Avatar name={m.full_name} photoUrl={m.photo_url} size={44} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{m.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{m.business_name} · {m.profession}</p>
              <p className="text-[11px] text-gray-400">{m.chapters?.city_name}</p>
            </div>
            <ContactButtons phone={m.phone} whatsapp={m.whatsapp} size="sm" />
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">No members found.</p>
        )}
      </div>
    </div>
  )
}
