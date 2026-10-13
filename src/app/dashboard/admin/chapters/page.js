import { createClient } from '@/lib/supabase-server'
import { createChapter, assignLocalAdmin } from '../actions'
import Avatar from '../../Avatar'

export default async function ChaptersPage() {
  const supabase = await createClient()
  const { data: chapters } = await supabase
    .from('chapters')
    .select('*, profiles!fk_local_admin ( full_name, photo_url )')
    .order('city_name')

  const { data: members } = await supabase
    .from('profiles')
    .select('id, full_name, role, chapter_id')
    .eq('status', 'approved')
    .neq('role', 'super_admin')

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold text-gray-900 mb-4">Chapters</h1>

      <form action={createChapter} className="bg-white border border-gray-200 rounded-xl p-3.5 mb-5 flex gap-2">
        <input name="cityName" placeholder="New city name" className="flex-1 border border-gray-200 p-2 rounded-lg text-sm" required />
        <button className="text-xs font-medium text-white bg-blue-700 px-4 rounded-lg">Add</button>
      </form>

      <div className="space-y-3">
        {chapters?.map((ch) => {
          const chapterMembers = (members || []).filter((m) => m.chapter_id === ch.id && m.role === 'member')
          return (
            <div key={ch.id} className="bg-white border border-gray-200 rounded-xl p-3.5">
              <div className="flex items-center gap-2.5">
                {ch.profiles?.full_name && <Avatar name={ch.profiles.full_name} photoUrl={ch.profiles.photo_url} size={32} />}
                <div>
                  <p className="text-sm font-semibold text-gray-900">{ch.city_name}</p>
                  <p className="text-xs text-gray-400">Local Admin: {ch.profiles?.full_name || 'Not assigned'}</p>
                </div>
              </div>

              <form
                action={async (formData) => {
                  'use server'
                  await assignLocalAdmin(formData.get('memberId'), ch.id)
                }}
                className="flex gap-2 mt-3"
              >
                <select name="memberId" className="flex-1 border border-gray-200 p-2 rounded-lg text-xs" required>
                  <option value="">-- Assign Local Admin (from this chapter's members) --</option>
                  {chapterMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
                <button className="text-xs font-medium text-white bg-green-600 px-3 rounded-lg">Assign</button>
              </form>
            </div>
          )
        })}
        {(!chapters || chapters.length === 0) && <p className="text-center text-gray-400 text-sm py-8">No chapters yet.</p>}
      </div>
    </div>
  )
}
