import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { UserCheck, Building2, Edit3, CreditCard, Activity as ActivityIcon, UserPlus } from 'lucide-react'

export default async function AdminHub() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('profiles').select('role, chapter_id, chapters!profiles_chapter_id_fkey ( city_name )').eq('id', user.id).single()

  const isSuper = me.role === 'super_admin'

  let pendingMembersQuery = supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending')
  if (!isSuper) pendingMembersQuery = pendingMembersQuery.eq('chapter_id', me.chapter_id)
  const { count: pendingMembersCount } = await pendingMembersQuery

  let pendingChangesCount = 0
  if (isSuper) {
    const { count } = await supabase.from('pending_profile_changes').select('id', { count: 'exact', head: true }).eq('status', 'pending')
    pendingChangesCount = count || 0
  }

  const cards = isSuper
    ? [
        { href: '/dashboard/admin/requests', label: 'Member Requests', icon: UserCheck, desc: 'Approve or reject new signups', badge: pendingMembersCount },
        { href: '/dashboard/admin/chapters', label: 'Chapters', icon: Building2, desc: 'Create cities, assign local admins' },
        { href: '/dashboard/admin/profile-changes', label: 'Profile Changes', icon: Edit3, desc: 'Approve business detail edits', badge: pendingChangesCount },
        { href: '/dashboard/admin/membership', label: 'Membership', icon: CreditCard, desc: 'Renewals (1 Jan cycle)' },
        { href: '/dashboard/admin/activity', label: 'Activity Log', icon: ActivityIcon, desc: 'What local admins have been doing' },
        { href: '/dashboard/admin/add-member', label: 'Add Member', icon: UserPlus, desc: 'Directly create a member account' },
      ]
    : [
        { href: '/dashboard/admin/requests', label: 'Member Requests', icon: UserCheck, desc: `New signups for ${me.chapters?.city_name}`, badge: pendingMembersCount },
      ]

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold text-gray-900 mb-1">Admin</h1>
      <p className="text-xs text-gray-400 mb-4">{isSuper ? 'Super Admin' : `Local Admin · ${me.chapters?.city_name}`}</p>

      <div className="space-y-2">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-3.5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700 shrink-0">
              <c.icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{c.label}</p>
              <p className="text-xs text-gray-400">{c.desc}</p>
            </div>
            {c.badge > 0 && (
              <span className="bg-red-600 text-white text-[11px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shrink-0">
                {c.badge}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}