import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function PendingApprovalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('status, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.status === 'approved') redirect('/dashboard')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-sm text-center">
        {profile?.status === 'rejected' ? (
          <>
            <h1 className="text-xl font-bold text-red-700 mb-2">Request Declined</h1>
            <p className="text-sm text-gray-600">Your membership request Not approved. Ask or contact your chapter admin.</p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4 text-2xl">⏳</div>
            <h1 className="text-xl font-bold text-blue-900 mb-2">Approval Pending</h1>
            <p className="text-sm text-gray-600">
              Namaste {profile?.full_name}, Your Profile Has been Submitted.You can use App After your Profile Approved by admin.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
