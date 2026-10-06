'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (error) {
      setError('Email ya password galat hai')
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={handleLogin} className="bg-white p-6 sm:p-8 rounded-2xl shadow-md w-full max-w-sm">
        <div className="flex justify-center mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-full.svg" alt="Business Linker" className="h-14 w-auto rounded-lg" />
        </div>
        <p className="text-sm text-gray-500 mb-6 text-center">Apne account mein login karein</p>

        {error && <p className="text-red-500 mb-4 text-sm text-center">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-2.5 rounded-lg mb-3"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-2.5 rounded-lg mb-4"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-700 text-white p-2.5 rounded-lg hover:bg-blue-800 disabled:opacity-50 font-medium"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <p className="text-center text-sm text-gray-500 mt-5">
          Naye member hain?{' '}
          <Link href="/signup" className="text-blue-700 font-medium hover:underline">
            Account banayein
          </Link>
        </p>
      </form>
    </div>
  )
}
