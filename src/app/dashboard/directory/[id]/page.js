import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import Avatar from '../../Avatar'
import ContactButtons from '../../ContactButtons'
import { ChevronLeft, GraduationCap, Briefcase, MapPin, Cake, Building2 } from 'lucide-react'

export default async function ProfileDetailPage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: m } = await supabase
    .from('profiles')
    .select('*, chapters!profiles_chapter_id_fkey ( city_name )')
    .eq('id', id)
    .single()

  if (!m) {
    return <div className="p-8 text-center text-gray-400 text-sm">Profile not found.</div>
  }

  return (
    <div>
      <div className="px-4 pt-3 pb-1">
        <Link href="/dashboard/directory" className="inline-flex items-center gap-1 text-xs font-medium text-blue-700">
          <ChevronLeft size={15} /> Back
        </Link>
      </div>

      <div className="px-4 pt-2">
        <div className="flex items-center gap-4">
          <Avatar name={m.full_name} photoUrl={m.photo_url} size={72} />
          <div className="flex-1 min-w-0">
            <p className="text-xl font-bold text-gray-900">{m.full_name}</p>
            <p className="text-sm text-gray-500">{m.profession} · {m.business_name}</p>
            <span className="inline-block text-[10px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full mt-1">{m.chapters?.city_name}</span>
          </div>
        </div>

        <div className="mt-4">
          <ContactButtons phone={m.phone} whatsapp={m.whatsapp} />
        </div>

        {m.bio && <p className="text-sm mt-4 leading-relaxed text-gray-700">{m.bio}</p>}

        <div className="mt-4 space-y-2.5 pb-6">
          {m.age && <div className="flex items-center gap-2.5 text-sm text-gray-700"><Cake size={16} className="text-gray-400" /> {m.age} years old</div>}
          {m.education && <div className="flex items-center gap-2.5 text-sm text-gray-700"><GraduationCap size={16} className="text-gray-400" /> {m.education}</div>}
          {m.experience && <div className="flex items-center gap-2.5 text-sm text-gray-700"><Briefcase size={16} className="text-gray-400" /> {m.experience}</div>}
          {m.business_category && <div className="flex items-center gap-2.5 text-sm text-gray-700"><Building2 size={16} className="text-gray-400" /> {m.business_category}</div>}
          <div className="flex items-center gap-2.5 text-sm text-gray-700"><MapPin size={16} className="text-gray-400" /> {m.chapters?.city_name} Chapter</div>
        </div>
      </div>
    </div>
  )
}
