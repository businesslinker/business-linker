import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (me.role !== 'super_admin' && me.role !== 'local_admin') {
    redirect('/dashboard/feed')
  }

  return <>{children}</>
}
