import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Nav from './Nav'

export default async function DashboardLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, photo_url, status, chapter_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.status !== 'approved') redirect('/pending-approval')

  let pendingCount = 0
  if (profile.role === 'super_admin') {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
    pendingCount = count || 0
  } else if (profile.role === 'local_admin') {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('chapter_id', profile.chapter_id)
    pendingCount = count || 0
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav role={profile.role} name={profile.full_name} photoUrl={profile.photo_url} pendingCount={pendingCount} />
      <main className="max-w-2xl mx-auto pb-24">{children}</main>
    </div>
  )
}