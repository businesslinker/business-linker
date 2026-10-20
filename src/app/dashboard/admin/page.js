import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { UserCheck, Building2, Edit3, CreditCard, Activity as ActivityIcon, UserPlus, Users } from 'lucide-react'

// Current year in India, so the 1 January switch happens at the right moment
function currentYearIST() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getFullYear()
}

export default async function AdminHub() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('profiles').select('role, chapter_id, chapters!profiles_chapter_id_fkey ( city_name )').eq('id', user.id).single()

  const isSuper = me.role === 'super_admin'

  let pendingMembersQuery = supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending')
  if (!isSuper) pendingMembersQuery = pendingMembersQuery.eq('chapter_id', me.chapter_id)
  const { count: pendingMembersCount } = await pendingMembersQuery

  let pendingChangesCount = 0
  let overview = null

  if (isSuper) {
    const { count } = await supabase.from('pending_profile_changes').select('id', { count: 'exact', head: true }).eq('status', 'pending')
    pendingChangesCount = count || 0

    const { data: chaptersData } = await supabase
      .from('chapters')
      .select('id, city_name, profiles!fk_local_admin ( full_name )')
      .order('city_name')

    const { data: people } = await supabase
      .from('profiles')
      .select('chapter_id, membership_paid_through_year')
      .eq('status', 'approved')
      .neq('role', 'super_admin')

    const { count: upcomingEvents } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .gte('event_date', new Date().toISOString())

    const year = currentYearIST()
    const rows = (chaptersData || []).map((ch) => {
      const list = (people || []).filter((p) => p.chapter_id === ch.id)
      return {
        id: ch.id,
        city: ch.city_name,
        admin: ch.profiles?.full_name || null,
        total: list.length,
        expired: list.filter((p) => (p.membership_paid_through_year || 0) < year).length,
      }
    })

    overview = {
      totalMembers: (people || []).length,
      expired: rows.reduce((sum, r) => sum + r.expired, 0),
      upcomingEvents: upcomingEvents || 0,
      rows,
    }
  }

  const cards = isSuper
    ? [
        { href: '/dashboard/admin/requests', label: 'Member Requests', icon: UserCheck, desc: 'Approve or reject new signups', badge: pendingMembersCount },
        { href: '/dashboard/admin/members', label: 'Manage Members', icon: Users, desc: 'Edit details, change chapter, remove members' },
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

      {overview && (
        <div className="mb-5">
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-white border border-gray-200 rounded-xl p-3">
              <p className="text-[11px] text-gray-400">Members</p>
              <p className="text-xl font-bold text-gray-900">{overview.totalMembers}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3">
              <p className="text-[11px] text-gray-400">Expired</p>
              <p className={`text-xl font-bold ${overview.expired > 0 ? 'text-red-600' : 'text-gray-900'}`}>{overview.expired}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3">
              <p className="text-[11px] text-gray-400">Upcoming events</p>
              <p className="text-xl font-bold text-gray-900">{overview.upcomingEvents}</p>
            </div>
          </div>

          {overview.rows.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
              {overview.rows.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{r.city}</p>
                    <p className="text-[11px] text-gray-400">{r.admin ? `Local Admin: ${r.admin}` : 'No Local Admin'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{r.total} members</p>
                    {r.expired > 0 && <p className="text-[11px] text-red-600">{r.expired} expired</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
