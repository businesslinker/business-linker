'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Home, Users, Calendar, ShieldCheck, User } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard/feed', label: 'Feed', Icon: Home },
  { href: '/dashboard/directory', label: 'Directory', Icon: Users },
  { href: '/dashboard/events', label: 'Events', Icon: Calendar },
  { href: '/dashboard/profile', label: 'Profile', Icon: User },
]

export default function Nav({ role, name, photoUrl, pendingCount = 0 }) {
  const pathname = usePathname()
  const router = useRouter()
  const isAdmin = role === 'super_admin' || role === 'local_admin'

  const items = isAdmin
    ? [...NAV_ITEMS.slice(0, 3), { href: '/dashboard/admin', label: 'Admin', Icon: ShieldCheck, badge: pendingCount }, NAV_ITEMS[3]]
    : NAV_ITEMS

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const roleLabel = role === 'super_admin' ? 'Super Admin' : role === 'local_admin' ? 'Local Admin' : 'Member'

  return (
    <>
      <div className="bg-blue-700 text-white sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.svg" alt="" className="w-8 h-8 rounded-lg" />
            <div>
              <p className="font-bold leading-none">Business Linker</p>
              <p className="text-[11px] text-blue-200 mt-0.5">{name} · {roleLabel}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-xs text-blue-100 hover:text-white">
            Logout
          </button>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-around px-1 py-1.5">
          {items.map((item) => {
            const active = pathname.startsWith(item.href)
            const Icon = item.Icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium ${active ? 'text-blue-700' : 'text-gray-400'}`}
              >
                <span className="relative">
                  <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                  {item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-red-600 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </span>
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
