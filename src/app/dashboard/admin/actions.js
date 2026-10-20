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

// Only Local Admin actions are logged, so the Super Admin can oversee them.
async function logActivity(admin, caller, actionType, referenceId, chapterId, description) {
  if (caller.role !== 'local_admin') return
  await admin.from('activity_log').insert({
    actor_id: caller.id,
    action_type: actionType,
    reference_id: referenceId,
    chapter_id: chapterId,
    description,
  })
}

// Renewal is on 1 January every year. This returns the year a renewal should cover.
function nextDueYear(paidThroughYear) {
  const currentYear = new Date().getFullYear()
  return Math.max(currentYear, (paidThroughYear || 0) + 1)
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

  const { error } = await admin.from('profiles').update({
    status: 'approved',
    membership_paid_through_year: new Date().getFullYear(),
  }).eq('id', profileId)
  if (error) return { error: error.message }

  await logActivity(admin, caller, 'member_approved', profileId, target.chapter_id, `Approved new member "${target.full_name}"`)

  revalidatePath('/dashboard/admin/requests')
  return { success: true }
}

export async function rejectMember(profileId) {
  const caller = await getCaller()
  if (!caller) return { error: 'Not authorized' }
  const admin = createAdminClient()

  const { data: target } = await admin.from('profiles').select('chapter_id, full_name').eq('id', profileId).single()
  if (!target) return { error: 'Member not found' }

  const authorized = caller.role === 'super_admin' || (caller.role === 'local_admin' && caller.chapter_id === target.chapter_id)
  if (!authorized) return { error: 'Not authorized' }

  const { error } = await admin.from('profiles').update({ status: 'rejected' }).eq('id', profileId)
  if (error) return { error: error.message }

  await logActivity(admin, caller, 'member_rejected', profileId, target.chapter_id, `Rejected signup request from "${target.full_name}"`)

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

// Assigns a Local Admin. If the chapter already has one, that person goes back to being a normal member.
export async function assignLocalAdmin(profileId, chapterId) {
  const caller = await getCaller()
  if (caller?.role !== 'super_admin') return { error: 'Not authorized' }
  const admin = createAdminClient()

  const { data: person } = await admin.from('profiles').select('chapter_id, role, status').eq('id', profileId).single()
  if (!person || person.status !== 'approved') return { error: 'Member not found' }
  if (person.chapter_id !== chapterId) return { error: 'This member does not belong to that chapter' }
  if (person.role === 'super_admin') return { error: 'Not allowed' }

  const { data: chapter } = await admin.from('chapters').select('local_admin_id').eq('id', chapterId).single()
  if (chapter?.local_admin_id && chapter.local_admin_id !== profileId) {
    await admin.from('profiles').update({ role: 'member' }).eq('id', chapter.local_admin_id)
  }

  const { error: err1 } = await admin.from('profiles').update({ role: 'local_admin' }).eq('id', profileId)
  if (err1) return { error: err1.message }

  const { error: err2 } = await admin.from('chapters').update({ local_admin_id: profileId }).eq('id', chapterId)
  if (err2) return { error: err2.message }

  revalidatePath('/dashboard/admin/chapters')
  return { success: true }
}

export async function removeLocalAdmin(chapterId) {
  const caller = await getCaller()
  if (caller?.role !== 'super_admin') return { error: 'Not authorized' }
  const admin = createAdminClient()

  const { data: chapter } = await admin.from('chapters').select('local_admin_id').eq('id', chapterId).single()
  if (!chapter?.local_admin_id) return { error: 'This chapter has no Local Admin' }

  await admin.from('profiles').update({ role: 'member' }).eq('id', chapter.local_admin_id)
  const { error } = await admin.from('chapters').update({ local_admin_id: null }).eq('id', chapterId)
  if (error) return { error: error.message }

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
  const { error } = await admin.from('profiles').update({ membership_paid_through_year: nextDueYear(target?.membership_paid_through_year) }).eq('id', profileId)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/admin/membership')
  return { success: true }
}

export async function markMembershipRenewedBulk(profileIds) {
  const caller = await getCaller()
  if (caller?.role !== 'super_admin') return { error: 'Not authorized' }
  if (!Array.isArray(profileIds) || profileIds.length === 0) return { error: 'No members selected' }
  const admin = createAdminClient()

  const { data: targets } = await admin.from('profiles').select('id, membership_paid_through_year').in('id', profileIds)

  let count = 0
  for (const t of targets || []) {
    const { error } = await admin.from('profiles')
      .update({ membership_paid_through_year: nextDueYear(t.membership_paid_through_year) })
      .eq('id', t.id)
    if (!error) count++
  }

  revalidatePath('/dashboard/admin/membership')
  return { success: true, count }
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
    membership_paid_through_year: new Date().getFullYear(),
  })

  if (profileError) {
    // Do not leave a login account behind without a profile
    await admin.auth.admin.deleteUser(newUser.user.id)
    return { error: profileError.message }
  }

  revalidatePath('/dashboard/admin/members')
  return { success: true, tempPassword, email }
}

// ---------- Edit / remove an existing member (super admin only) ----------

export async function adminUpdateMember(profileId, formData) {
  const caller = await getCaller()
  if (caller?.role !== 'super_admin') return { error: 'Not authorized' }
  const admin = createAdminClient()

  const { data: target } = await admin.from('profiles').select('role, chapter_id').eq('id', profileId).single()
  if (!target) return { error: 'Member not found' }
  if (target.role === 'super_admin') return { error: 'The Super Admin account cannot be edited here' }

  const newChapterId = formData.get('chapterId')
  const update = {
    full_name: formData.get('fullName'),
    age: formData.get('age') ? Number(formData.get('age')) : null,
    chapter_id: newChapterId,
    business_name: formData.get('businessName'),
    profession: formData.get('profession'),
    business_category: formData.get('businessCategory'),
    education: formData.get('education'),
    experience: formData.get('experience'),
    bio: formData.get('bio'),
    phone: formData.get('phone'),
    whatsapp: formData.get('whatsapp'),
  }

  // A Local Admin who is moved to another chapter goes back to being a normal member
  if (target.role === 'local_admin' && newChapterId !== target.chapter_id) {
    update.role = 'member'
    await admin.from('chapters').update({ local_admin_id: null }).eq('id', target.chapter_id).eq('local_admin_id', profileId)
  }

  const { error } = await admin.from('profiles').update(update).eq('id', profileId)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/admin/members')
  revalidatePath('/dashboard/directory')
  return { success: true }
}

export async function removeMember(profileId) {
  const caller = await getCaller()
  if (caller?.role !== 'super_admin') return { error: 'Not authorized' }
  if (profileId === caller.id) return { error: 'You cannot remove your own account' }
  const admin = createAdminClient()

  const { data: target } = await admin.from('profiles').select('role').eq('id', profileId).single()
  if (!target) return { error: 'Member not found' }
  if (target.role === 'super_admin') return { error: 'The Super Admin account cannot be removed' }

  // Deleting the login account also removes the profile and everything linked to it
  const { error } = await admin.auth.admin.deleteUser(profileId)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/admin/members')
  revalidatePath('/dashboard/directory')
  revalidatePath('/dashboard/feed')
  return { success: true }
}
