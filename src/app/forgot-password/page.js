'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-md w-full max-w-sm">
        <div className="flex justify-center mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-full.svg" alt="Business Linker" className="h-14 w-auto rounded-lg" />
        </div>

        {sent ? (
          <div className="text-center">
            <h1 className="text-lg font-bold text-blue-900 mb-2">Check your email</h1>
            <p className="text-sm text-gray-600 mb-5">
              If an account exists for <b>{email}</b>, we have sent a link to reset your password. It may take a minute to arrive.
            </p>
            <Link href="/login" className="text-sm text-blue-700 font-medium hover:underline">Back to login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h1 className="text-lg font-bold text-blue-900 mb-1 text-center">Forgot your password?</h1>
            <p className="text-sm text-gray-500 mb-6 text-center">Enter your email and we will send you a reset link.</p>

            {error && <p className="text-red-500 mb-4 text-sm text-center">{error}</p>}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border p-2.5 rounded-lg mb-4"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 text-white p-2.5 rounded-lg hover:bg-blue-800 disabled:opacity-50 font-medium"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <p className="text-center text-sm text-gray-500 mt-5">
              <Link href="/login" className="text-blue-700 font-medium hover:underline">Back to login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
