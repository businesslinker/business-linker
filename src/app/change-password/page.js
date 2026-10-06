'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function ChangePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password Must be 6 digit long')
      return
    }
    if (password !== confirm) {
      setError('Password not Matching')
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error: pwError } = await supabase.auth.updateUser({ password })
    if (pwError) {
      setError(pwError.message)
      return
    }

    await supabase.from('profiles').update({ must_change_password: false }).eq('id', user.id)

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl shadow-md w-full max-w-sm">
        <h1 className="text-xl font-bold mb-2 text-center text-blue-900">Set new password</h1>
        <p className="text-sm text-gray-500 mb-6 text-center">This is your First Login.</p>

        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}

        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-2.5 rounded-lg mb-3"
          required
        />
        <input
          type="password"
          placeholder="Please Confirm Password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full border p-2.5 rounded-lg mb-4"
          required
        />
        <button className="w-full bg-blue-700 text-white p-2.5 rounded-lg hover:bg-blue-800 font-medium">
          Set Password
        </button>
      </form>
    </div>
  )
}
