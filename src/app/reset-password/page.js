'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const [status, setStatus] = useState('checking') // 'checking' | 'ready' | 'invalid'
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const supabase = createClient()

      // Some email templates send the person back with a one-time code in the link
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        await supabase.auth.exchangeCodeForSession(code)
      }

      const { data: { user } } = await supabase.auth.getUser()
      setStatus(user ? 'ready' : 'invalid')
    }
    init()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-md w-full max-w-sm">
        {status === 'checking' && <p className="text-center text-sm text-gray-400">Checking your link...</p>}

        {status === 'invalid' && (
          <div className="text-center">
            <h1 className="text-lg font-bold text-red-700 mb-2">Link expired</h1>
            <p className="text-sm text-gray-600 mb-5">This reset link is invalid or has expired. Please request a new one.</p>
            <Link href="/forgot-password" className="text-sm text-blue-700 font-medium hover:underline">Request a new link</Link>
          </div>
        )}

        {status === 'ready' && (
          <form onSubmit={handleSubmit}>
            <h1 className="text-lg font-bold text-blue-900 mb-1 text-center">Set a new password</h1>
            <p className="text-sm text-gray-500 mb-6 text-center">Choose a password you have not used before.</p>

            {error && <p className="text-red-500 mb-4 text-sm text-center">{error}</p>}

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
              placeholder="Confirm Password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border p-2.5 rounded-lg mb-4"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 text-white p-2.5 rounded-lg hover:bg-blue-800 disabled:opacity-50 font-medium"
            >
              {loading ? 'Saving...' : 'Save Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
