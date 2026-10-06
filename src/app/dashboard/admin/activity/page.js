import { createClient } from '@/lib/supabase-server'
import Avatar from '../../Avatar'
import { UserCheck, CalendarPlus } from 'lucide-react'

export default async function ActivityPage() {
  const supabase = await createClient()
  const { data: log } = await supabase
    .from('activity_log')
    .select('*, profiles ( full_name, photo_url ), chapters ( city_name )')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold text-gray-900 mb-1">Activity Log</h1>
      <p className="text-xs text-gray-400 mb-4">Local Admins ne kya-kya kiya — approvals aur events.</p>

      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        {log?.map((item) => (
          <div key={item.id} className="flex items-start gap-3 p-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 shrink-0 mt-0.5">
              {item.action_type === 'event_created' ? <CalendarPlus size={15} /> : <UserCheck size={15} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800">
                <span className="font-semibold">{item.profiles?.full_name}</span> · {item.description}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {item.chapters?.city_name} · {new Date(item.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          </div>
        ))}
        {(!log || log.length === 0) && <p className="p-4 text-center text-gray-400 text-sm">Abhi koi activity nahi hai.</p>}
      </div>
    </div>
  )
}
