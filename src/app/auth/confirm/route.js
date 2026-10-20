import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Email links (password reset, etc.) land here. It checks the one-time token,
// signs the person in, and sends them on to the page named in "next".
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  let next = searchParams.get('next') || '/dashboard'

  // Only allow redirects inside this site
  if (!next.startsWith('/') || next.startsWith('//')) next = '/dashboard'

  if (tokenHash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  return NextResponse.redirect(new URL('/reset-password', request.url))
}
