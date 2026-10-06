'use server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'

async function getCaller() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('id, role, chapter_id').eq('id', user.id).single()
  return data
}

// ---------- Member approvals ----------

export async function approveMember(profileId) {
  const caller = await getCaller()
  if (!caller) return { error: 'Not authorized' }
  const admin = createAdminClient()

  const { data: target } = await admin.from('profiles').select('chapter_id, full_name').eq('id', profileId).single()
  if (!target) return { error: 'Member not found' }

  const authorized = caller.role === 'super_admin' || (caller.role === 'local_admin' && caller.chapter_id === target.chapter_id)
  if (!authorized) return { error: 'Not authorized for this chapter' }

  const currentYear = new Date().getFullYear()
  const { error } = await admin.from('profiles').update({
    status: 'approved',
    membership_paid_through_year: currentYear,
  }).eq('id', profileId)

  if (error) return { error: error.message }

  if (caller.role === 'local_admin') {
    await admin.from('activity_log').insert({
      actor_id: caller.id,
      action_type: 'member_approved',
      reference_id: profileId,
      chapter_id: target.chapter_id,
      description: `Approved new member "${target.full_name}"`,
    })
  }

  revalidatePath('/dashboard/admin/requests')
  return { success: true }
}

export async function rejectMember(profileId) {
  const caller = await getCaller()
  if (!caller) return { error: 'Not authorized' }
  const admin = createAdminClient()

  const { data: target } = await admin.from('profiles').select('chapter_id').eq('id', profileId).single()
  const authorized = caller.role === 'super_admin' || (caller.role === 'local_admin' && caller.chapter_id === target?.chapter_id)
  if (!authorized) return { error: 'Not authorized' }

  await admin.from('profiles').update({ status: 'rejected' }).eq('id', profileId)
  revalidatePath('/dashboard/admin/requests')
  return { success: true }
}

// ---------- Chapters (super admin only) ----------

export async function createChapter(formData) {
  const caller = await getCaller()
  if (caller?.role !== 'super_admin') return { error: 'Not authorized' }
  const admin = createAdminClient()

  const { error } = await admin.from('chapters').insert({ city_name: formData.get('cityName') })
  if (error) return { error: error.message }

  revalidatePath('/dashboard/admin/chapters')
  return { success: true }
}

export async function assignLocalAdmin(profileId, chapterId) {
  const caller = await getCaller()
  if (caller?.role !== 'super_admin') return { error: 'Not authorized' }
  const admin = createAdminClient()

  const { error: err1 } = await admin.from('profiles').update({ role: 'local_admin', chapter_id: chapterId }).eq('id', profileId)
  if (err1) return { error: err1.message }

  const { error: err2 } = await admin.from('chapters').update({ local_admin_id: profileId }).eq('id', chapterId)
  if (err2) return { error: err2.message }

  revalidatePath('/dashboard/admin/chapters')
  return { success: true }
}

// ---------- Sensitive profile-change approvals (super admin only) ----------

export async function approveProfileChange(changeId) {
  const caller = await getCaller()
  if (caller?.role !== 'super_admin') return { error: 'Not authorized' }
  const admin = createAdminClient()

  const { data: change } = await admin.from('pending_profile_changes').select('*').eq('id', changeId).single()
  if (!change) return { error: 'Not found' }

  const { error: err1 } = await admin.from('profiles').update({
    business_name: change.requested_business_name,
    profession: change.requested_profession,
    business_category: change.requested_business_category,
  }).eq('id', change.profile_id)
  if (err1) return { error: err1.message }

  await admin.from('pending_profile_changes').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', changeId)

  revalidatePath('/dashboard/admin/profile-changes')
  return { success: true }
}

export async function rejectProfileChange(changeId) {
  const caller = await getCaller()
  if (caller?.role !== 'super_admin') return { error: 'Not authorized' }
  const admin = createAdminClient()

  await admin.from('pending_profile_changes').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', changeId)
  revalidatePath('/dashboard/admin/profile-changes')
  return { success: true }
}

// ---------- Membership renewal (super admin only) ----------

export async function markMembershipRenewed(profileId) {
  const caller = await getCaller()
  if (caller?.role !== 'super_admin') return { error: 'Not authorized' }
  const admin = createAdminClient()

  const { data: target } = await admin.from('profiles').select('membership_paid_through_year').eq('id', profileId).single()
  const currentYear = new Date().getFullYear()
  const nextDueYear = Math.max(currentYear, (target?.membership_paid_through_year || 0) + 1)

  const { error } = await admin.from('profiles').update({ membership_paid_through_year: nextDueYear }).eq('id', profileId)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/admin/membership')
  return { success: true }
}

// ---------- Direct member add (super admin only) ----------

export async function adminAddMember(formData) {
  const caller = await getCaller()
  if (caller?.role !== 'super_admin') return { error: 'Not authorized' }

  const admin = createAdminClient()
  const email = formData.get('email')
  const chapterId = formData.get('chapterId')
  const tempPassword = Math.random().toString(36).slice(-8) + 'A1!'

  const { data: newUser, error: authError } = await admin.auth.admin.createUser({
    email, password: tempPassword, email_confirm: true,
  })
  if (authError) return { error: authError.message }

  const currentYear = new Date().getFullYear()
  const { error: profileError } = await admin.from('profiles').insert({
    id: newUser.user.id,
    email,
    role: 'member',
    status: 'approved',
    must_change_password: true,
    full_name: formData.get('fullName'),
    age: formData.get('age') ? Number(formData.get('age')) : null,
    chapter_id: chapterId,
    business_name: formData.get('businessName'),
    profession: formData.get('profession'),
    business_category: formData.get('businessCategory'),
    phone: formData.get('phone'),
    whatsapp: formData.get('whatsapp') || formData.get('phone'),
    membership_paid_through_year: currentYear,
  })

  if (profileError) return { error: profileError.message }

  revalidatePath('/dashboard/admin')
  return { success: true, tempPassword, email }
}
