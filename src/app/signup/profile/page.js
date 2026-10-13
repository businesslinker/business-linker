'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function SignupProfilePage() {
  const [chapters, setChapters] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.from('chapters').select('id, city_name').order('city_name')
      setChapters(data || [])
    }
    load()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('Your session has expired, please sign up again')
      setLoading(false)
      return
    }

    const form = e.target
    let photoUrl = null
    const photoFile = form.photo.files[0]

    if (photoFile) {
      const fileName = `${user.id}-${Date.now()}.${photoFile.name.split('.').pop()}`
      const { error: uploadError } = await supabase.storage
        .from('member-photos')
        .upload(fileName, photoFile, { upsert: true })

      if (uploadError) {
        setError(uploadError.message)
        setLoading(false)
        return
      }
      const { data: urlData } = supabase.storage.from('member-photos').getPublicUrl(fileName)
      photoUrl = urlData.publicUrl
    }

    const { error: insertError } = await supabase.from('profiles').insert({
      id: user.id,
      email: user.email,
      role: 'member',
      status: 'pending',
      full_name: form.fullName.value,
      age: form.age.value ? Number(form.age.value) : null,
      chapter_id: form.chapterId.value,
      business_name: form.businessName.value,
      profession: form.profession.value,
      business_category: form.businessCategory.value,
      education: form.education.value,
      experience: form.experience.value,
      bio: form.bio.value,
      phone: form.phone.value,
      whatsapp: form.whatsapp.value || form.phone.value,
      photo_url: photoUrl,
    })

    setLoading(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    router.push('/pending-approval')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl shadow-md w-full max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-1 text-center text-blue-900">Build Your Profile</h1>
        <p className="text-sm text-gray-500 mb-6 text-center">Step 2 of 2 — the more detail, the better the networking</p>

        {error && <p className="text-red-500 mb-4 text-sm text-center">{error}</p>}

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Photo</label>
            <input type="file" name="photo" accept="image/*" className="w-full text-sm border p-2 rounded-lg" />
          </div>

          <input name="fullName" placeholder="Full Name" className="w-full border p-2.5 rounded-lg" required />

          <div className="grid grid-cols-2 gap-3">
            <input name="age" type="number" min="18" max="100" placeholder="Age" className="w-full border p-2.5 rounded-lg" required />
            <select name="chapterId" className="w-full border p-2.5 rounded-lg" required>
              <option value="">-- Chapter/City --</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>{c.city_name}</option>
              ))}
            </select>
          </div>

          <input name="businessName" placeholder="Business Name" className="w-full border p-2.5 rounded-lg" required />
          <input name="profession" placeholder="Profession (e.g. CA, Interior Contractor)" className="w-full border p-2.5 rounded-lg" required />
          <input name="businessCategory" placeholder="Business Category (e.g. Finance, Textiles)" className="w-full border p-2.5 rounded-lg" required />
          <input name="education" placeholder="Education" className="w-full border p-2.5 rounded-lg" required />
          <input name="experience" placeholder="Experience (e.g. 9 years in interiors)" className="w-full border p-2.5 rounded-lg" required />
          <textarea name="bio" placeholder="Short bio — tell the chapter about your business" rows={3} className="w-full border p-2.5 rounded-lg" required />

          <div className="grid grid-cols-2 gap-3">
            <input
              name="phone"
              type="tel"
              placeholder="Phone Number (10 digit)"
              pattern="(\+91[\-\s]?)?[6-9][0-9]{9}"
              title="Enter a 10-digit Indian mobile number (e.g. 9876543210 or +91 9876543210)"
              className="w-full border p-2.5 rounded-lg"
              required
            />
            <input
              name="whatsapp"
              type="tel"
              placeholder="WhatsApp Number"
              pattern="(\+91[\-\s]?)?[6-9][0-9]{9}"
              title="Enter a 10-digit Indian mobile number (e.g. 9876543210 or +91 9876543210)"
              className="w-full border p-2.5 rounded-lg"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-700 text-white p-2.5 rounded-lg hover:bg-blue-800 disabled:opacity-50 font-medium mt-5"
        >
          {loading ? 'Submitting...' : 'Submit for Approval'}
        </button>
      </form>
    </div>
  )
}
