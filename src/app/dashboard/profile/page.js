'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Avatar from '../Avatar'
import ContactButtons from '../ContactButtons'
import { ShieldCheck, AlertTriangle, Clock } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [pendingChange, setPendingChange] = useState(null)
  const [editingBasic, setEditingBasic] = useState(false)
  const [editingSensitive, setEditingSensitive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

   async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { data } = await supabase.from('profiles').select('*, chapters!profiles_chapter_id_fkey ( city_name )').eq('id', user.id).single()
    setProfile(data)

    const { data: pending } = await supabase
      .from('pending_profile_changes')
      .select('*')
      .eq('profile_id', user.id)
      .eq('status', 'pending')
      .maybeSingle()
    setPendingChange(pending)
  }

  useEffect(() => { load() }, [])

  async function handleBasicSave(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const form = e.target
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let photoUrl = profile.photo_url
    const photoFile = form.photo.files[0]
    if (photoFile) {
      const fileName = `${user.id}-${Date.now()}.${photoFile.name.split('.').pop()}`
      const { error: uploadError } = await supabase.storage.from('member-photos').upload(fileName, photoFile, { upsert: true })
      if (uploadError) { setError(uploadError.message); setLoading(false); return }
      const { data: urlData } = supabase.storage.from('member-photos').getPublicUrl(fileName)
      photoUrl = urlData.publicUrl
    }

    const { error: updateError } = await supabase.from('profiles').update({
      age: form.age.value ? Number(form.age.value) : null,
      education: form.education.value,
      experience: form.experience.value,
      bio: form.bio.value,
      phone: form.phone.value,
      whatsapp: form.whatsapp.value,
      photo_url: photoUrl,
    }).eq('id', user.id)

    setLoading(false)
    if (updateError) { setError(updateError.message); return }
    setEditingBasic(false)
    load()
  }

  async function handleSensitiveSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const form = e.target
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error: insertError } = await supabase.from('pending_profile_changes').insert({
      profile_id: user.id,
      requested_business_name: form.businessName.value,
      requested_profession: form.profession.value,
      requested_business_category: form.businessCategory.value,
    })

    setLoading(false)
    if (insertError) { setError(insertError.message); return }
    setEditingSensitive(false)
    setMsg('Request bhej diya — Super Admin approve karenge, tab tak purani details hi sabko dikhengi.')
    load()
  }

  if (!profile) return <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>

  const isMember = profile.role === 'member' || profile.role === 'local_admin'
  const currentYear = new Date().getFullYear()
  const membershipActive = profile.membership_paid_through_year >= currentYear

  return (
    <div className="p-4">
      <div className="flex items-center gap-3">
        <Avatar name={profile.full_name} photoUrl={profile.photo_url} size={64} />
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold text-gray-900">{profile.full_name}</p>
          <p className="text-sm text-gray-500">{profile.profession} · {profile.business_name}</p>
          <span className="inline-block text-[10px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full mt-1">{profile.chapters?.city_name}</span>
        </div>
      </div>

      <div className="mt-4"><ContactButtons phone={profile.phone} whatsapp={profile.whatsapp} /></div>

      {msg && <p className="text-xs text-green-700 bg-green-50 rounded-lg p-2.5 mt-4">{msg}</p>}

      {pendingChange && (
        <div className="flex items-start gap-2 bg-amber-50 text-amber-800 text-xs rounded-lg p-3 mt-4">
          <Clock size={14} className="mt-0.5 shrink-0" />
          Business Name / Profession / Category change request pending hai — Super Admin approve karne tak purani details hi sabko dikhengi.
        </div>
      )}

      {isMember && (
        <div className={`mt-4 rounded-xl p-3.5 ${membershipActive ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-center gap-1.5">
            {membershipActive ? <ShieldCheck size={15} className="text-green-700" /> : <AlertTriangle size={15} className="text-red-600" />}
            <p className={`text-xs font-semibold ${membershipActive ? 'text-green-700' : 'text-red-600'}`}>
              Membership {membershipActive ? 'Active' : 'Expired'}
            </p>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {membershipActive
              ? `Renews 1 January ${(profile.membership_paid_through_year || currentYear) + 1}`
              : 'Renewal ke liye Super Admin se sampark karein.'}
          </p>
        </div>
      )}

      {error && <p className="text-red-500 text-xs mt-3">{error}</p>}

      {/* Basic info edit */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">Profile Details</p>
          <button onClick={() => setEditingBasic((v) => !v)} className="text-xs font-medium text-blue-700">
            {editingBasic ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {editingBasic ? (
          <form onSubmit={handleBasicSave} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Photo</label>
              <input type="file" name="photo" accept="image/*" className="w-full text-sm border p-2 rounded-lg" />
            </div>
                        <input name="age" type="number" min="18" max="100" defaultValue={profile.age || ''} placeholder="Age" className="w-full border p-2.5 rounded-lg text-sm" required />
            <input name="education" defaultValue={profile.education || ''} placeholder="Education" className="w-full border p-2.5 rounded-lg text-sm" required />
            <input name="experience" defaultValue={profile.experience || ''} placeholder="Experience" className="w-full border p-2.5 rounded-lg text-sm" required />
            <textarea name="bio" defaultValue={profile.bio || ''} placeholder="Bio" rows={3} className="w-full border p-2.5 rounded-lg text-sm" required />
            <input
              name="phone"
              type="tel"
              defaultValue={profile.phone || ''}
              placeholder="Phone (10 digit)"
              pattern="(\+91[\-\s]?)?[6-9][0-9]{9}"
              title="10 digit Indian mobile number daalein (jaise 9876543210 ya +91 9876543210)"
              className="w-full border p-2.5 rounded-lg text-sm"
              required
            />
            <input
              name="whatsapp"
              type="tel"
              defaultValue={profile.whatsapp || ''}
              placeholder="WhatsApp Number"
              pattern="(\+91[\-\s]?)?[6-9][0-9]{9}"
              title="10 digit Indian mobile number daalein (jaise 9876543210 ya +91 9876543210)"
              className="w-full border p-2.5 rounded-lg text-sm"
              required
            />
            <button disabled={loading} className="w-full bg-blue-700 text-white p-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
              {loading ? 'Saving...' : 'Save'}
            </button>
          </form>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-1.5 text-sm text-gray-700">
            {profile.age && <p>{profile.age} years</p>}
            {profile.education && <p>{profile.education}</p>}
            {profile.experience && <p>{profile.experience}</p>}
            {profile.bio && <p className="text-gray-500 mt-1">{profile.bio}</p>}
          </div>
        )}
      </div>

      {/* Sensitive fields edit request */}
      {isMember && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-700">Business Details</p>
            {!pendingChange && (
              <button onClick={() => setEditingSensitive((v) => !v)} className="text-xs font-medium text-blue-700">
                {editingSensitive ? 'Cancel' : 'Request Change'}
              </button>
            )}
          </div>

          {editingSensitive ? (
            <form onSubmit={handleSensitiveSubmit} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <p className="text-[11px] text-gray-400">Ye changes Super Admin approve karenge tabhi live honge (har chapter mein ek business category sirf ek member ki hoti hai).</p>
              <input name="businessName" defaultValue={profile.business_name || ''} placeholder="Business Name" className="w-full border p-2.5 rounded-lg text-sm" required />
              <input name="profession" defaultValue={profile.profession || ''} placeholder="Profession" className="w-full border p-2.5 rounded-lg text-sm" required />
              <input name="businessCategory" defaultValue={profile.business_category || ''} placeholder="Business Category" className="w-full border p-2.5 rounded-lg text-sm" required />
              <button disabled={loading} className="w-full bg-blue-700 text-white p-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
                {loading ? 'Submitting...' : 'Submit for Approval'}
              </button>
            </form>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-1 text-sm text-gray-700">
              <p><span className="text-gray-400">Business:</span> {profile.business_name}</p>
              <p><span className="text-gray-400">Profession:</span> {profile.profession}</p>
              <p><span className="text-gray-400">Category:</span> {profile.business_category}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
