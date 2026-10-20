'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { adminUpdateMember, removeMember } from '../../actions'
import Avatar from '../../../Avatar'
import { ChevronLeft, Trash2 } from 'lucide-react'

export default function EditMemberPage() {
  const { id } = useParams()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [chapters, setChapters] = useState([])
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.from('profiles').select('*').eq('id', id).single()
      setProfile(data)
      const { data: chaptersData } = await supabase.from('chapters').select('id, city_name').order('city_name')
      setChapters(chaptersData || [])
    }
    load()
  }, [id])

  async function handleSave(formData) {
    setSaving(true)
    setError('')
    setMessage('')
    const res = await adminUpdateMember(id, formData)
    setSaving(false)
    if (res?.error) { setError(res.error); return }
    setMessage('Saved.')
    router.refresh()
  }

  async function handleRemove() {
    const ok = confirm(`Remove ${profile.full_name} permanently?\n\nTheir login, profile, posts, comments and RSVPs will be deleted. This cannot be undone.`)
    if (!ok) return
    setRemoving(true)
    const res = await removeMember(id)
    if (res?.error) { alert(res.error); setRemoving(false); return }
    router.push('/dashboard/admin/members')
    router.refresh()
  }

  if (!profile) return <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>

  const phonePattern = '(\\+91[\\-\\s]?)?[6-9][0-9]{9}'
  const phoneTitle = 'Enter a 10-digit Indian mobile number (e.g. 9876543210 or +91 9876543210)'

  return (
    <div className="p-4">
      <Link href="/dashboard/admin/members" className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 mb-3">
        <ChevronLeft size={15} /> Back
      </Link>

      <div className="flex items-center gap-3 mb-4">
        <Avatar name={profile.full_name} photoUrl={profile.photo_url} size={52} />
        <div>
          <p className="text-lg font-bold text-gray-900">{profile.full_name}</p>
          <p className="text-xs text-gray-400">{profile.email}</p>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
      {message && <p className="text-green-700 text-sm bg-green-50 rounded-lg p-2.5 mb-3">{message}</p>}

      <form action={handleSave} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <input name="fullName" defaultValue={profile.full_name || ''} placeholder="Full Name" className="w-full border p-2.5 rounded-lg text-sm" required />
        <div className="grid grid-cols-2 gap-3">
          <input name="age" type="number" min="18" max="100" defaultValue={profile.age || ''} placeholder="Age" className="w-full border p-2.5 rounded-lg text-sm" />
          <select name="chapterId" defaultValue={profile.chapter_id || ''} className="w-full border p-2.5 rounded-lg text-sm" required>
            {chapters.map((c) => (<option key={c.id} value={c.id}>{c.city_name}</option>))}
          </select>
        </div>
        {profile.role === 'local_admin' && (
          <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg p-2">This member is the Local Admin. Moving them to another chapter makes them a normal member again.</p>
        )}
        <input name="businessName" defaultValue={profile.business_name || ''} placeholder="Business Name" className="w-full border p-2.5 rounded-lg text-sm" required />
        <input name="profession" defaultValue={profile.profession || ''} placeholder="Profession" className="w-full border p-2.5 rounded-lg text-sm" required />
        <input name="businessCategory" defaultValue={profile.business_category || ''} placeholder="Business Category" className="w-full border p-2.5 rounded-lg text-sm" required />
        <input name="education" defaultValue={profile.education || ''} placeholder="Education" className="w-full border p-2.5 rounded-lg text-sm" />
        <input name="experience" defaultValue={profile.experience || ''} placeholder="Experience" className="w-full border p-2.5 rounded-lg text-sm" />
        <textarea name="bio" defaultValue={profile.bio || ''} placeholder="Bio" rows={3} className="w-full border p-2.5 rounded-lg text-sm" />
        <div className="grid grid-cols-2 gap-3">
          <input name="phone" type="tel" defaultValue={profile.phone || ''} placeholder="Phone" pattern={phonePattern} title={phoneTitle} className="w-full border p-2.5 rounded-lg text-sm" required />
          <input name="whatsapp" type="tel" defaultValue={profile.whatsapp || ''} placeholder="WhatsApp" pattern={phonePattern} title={phoneTitle} className="w-full border p-2.5 rounded-lg text-sm" required />
        </div>
        <button disabled={saving} className="w-full bg-blue-700 text-white p-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      <div className="mt-6 border border-red-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-red-700 mb-1">Remove member</p>
        <p className="text-xs text-gray-500 mb-3">Deletes their login, profile, posts, comments and RSVPs permanently.</p>
        <button
          onClick={handleRemove}
          disabled={removing}
          className="flex items-center justify-center gap-1.5 w-full text-sm font-medium text-white bg-red-600 py-2.5 rounded-lg disabled:opacity-50"
        >
          <Trash2 size={14} /> {removing ? 'Removing...' : 'Remove Member'}
        </button>
      </div>
    </div>
  )
}
