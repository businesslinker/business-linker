'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { adminAddMember } from '../actions'

export default function AddMemberPage() {
  const [chapters, setChapters] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.from('chapters').select('id, city_name').order('city_name')
      setChapters(data || [])
    }
    load()
  }, [])

  async function handleSubmit(formData) {
    setLoading(true)
    setError('')
    const res = await adminAddMember(formData)
    setLoading(false)
    if (res.error) { setError(res.error); return }
    setResult(res)
  }

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold text-gray-900 mb-4">Add Member Directly</h1>

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
          <p className="text-sm font-semibold text-green-800">Member added! Send them these login details:</p>
          <p className="text-sm mt-2 text-gray-700">Email: <b>{result.email}</b></p>
          <p className="text-sm text-gray-700">Temporary Password: <b>{result.tempPassword}</b></p>
        </div>
      )}
      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      <form action={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <input name="fullName" placeholder="Full Name" className="w-full border p-2.5 rounded-lg text-sm" required />
        <input name="email" type="email" placeholder="Email" className="w-full border p-2.5 rounded-lg text-sm" required />
        <div className="grid grid-cols-2 gap-3">
          <input name="age" type="number" min="18" max="100" placeholder="Age" className="w-full border p-2.5 rounded-lg text-sm" required />
          <select name="chapterId" className="w-full border p-2.5 rounded-lg text-sm" required>
            <option value="">-- Chapter --</option>
            {chapters.map((c) => (<option key={c.id} value={c.id}>{c.city_name}</option>))}
          </select>
        </div>
        <input name="businessName" placeholder="Business Name" className="w-full border p-2.5 rounded-lg text-sm" required />
        <input name="profession" placeholder="Profession" className="w-full border p-2.5 rounded-lg text-sm" required />
        <input name="businessCategory" placeholder="Business Category" className="w-full border p-2.5 rounded-lg text-sm" required />
        <div className="grid grid-cols-2 gap-3">
          <input
            name="phone"
            type="tel"
            placeholder="Phone (10 digit)"
            pattern="(\+91[\-\s]?)?[6-9][0-9]{9}"
            title="Enter a 10-digit Indian mobile number (e.g. 9876543210 or +91 9876543210)"
            className="w-full border p-2.5 rounded-lg text-sm"
            required
          />
          <input
            name="whatsapp"
            type="tel"
            placeholder="WhatsApp Number"
            pattern="(\+91[\-\s]?)?[6-9][0-9]{9}"
            title="Enter a 10-digit Indian mobile number (e.g. 9876543210 or +91 9876543210)"
            className="w-full border p-2.5 rounded-lg text-sm"
            required
          />
        </div>
        <button disabled={loading} className="w-full bg-blue-700 text-white p-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
          {loading ? 'Adding...' : 'Add Member'}
        </button>
      </form>
    </div>
  )
}
