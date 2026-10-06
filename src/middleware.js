import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  const protectedPrefixes = ['/dashboard', '/change-password', '/pending-approval', '/signup/profile']
  const isProtected = protectedPrefixes.some((p) => path.startsWith(p))

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isProtected) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('status, must_change_password')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile && path !== '/signup/profile') {
      return NextResponse.redirect(new URL('/signup/profile', request.url))
    }

    if (profile) {
      if (profile.must_change_password && path !== '/change-password') {
        return NextResponse.redirect(new URL('/change-password', request.url))
      }
      if (!profile.must_change_password && path.startsWith('/dashboard') && profile.status !== 'approved') {
        return NextResponse.redirect(new URL('/pending-approval', request.url))
      }
      if (profile.status === 'approved' && (path === '/pending-approval' || path === '/signup/profile')) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/change-password', '/pending-approval', '/signup/profile'],
}