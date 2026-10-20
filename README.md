# Business Linker

Multi-city business networking community app.
Roles: Super Admin, Local Admin, Member.

Stack: Next.js (App Router) + Tailwind CSS v4, Supabase (database, auth, photo storage), Vercel (hosting).

## Running locally

```bash
npm install
cp .env.local.example .env.local   # then fill in the Supabase values
npm run dev
```

Environment variables (also add these in Vercel -> Project -> Settings -> Environment Variables):

| Name | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase -> Settings -> API (just `https://xxxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the Publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | the Secret key (never share or commit it) |
| `RESEND_API_KEY` | only needed for reminder emails |

## Database

- **Brand-new Supabase project:** run `supabase/schema.sql`, create the two public storage buckets (`member-photos`, `post-photos`), then create your Super Admin using the SQL at the bottom of that file.
- **Existing project:** run `supabase/migration.sql` once. `supabase/migration-optional-storage-limits.sql` is an optional extra (5 MB cap per photo).

SQL changes live in Supabase and are not part of a git push.

## Updating the live app

Every push to the `main` branch of the GitHub repo is deployed automatically by Vercel (about 1-2 minutes). For risky changes, push to a branch first; Vercel gives each branch its own preview link.

## Password reset email

In Supabase -> Authentication -> Email Templates -> **Reset Password**, make the link:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
```

and set Authentication -> URL Configuration -> **Site URL** to your live address. This makes the link work even if the person opens it on a different device than the one they asked from.

## How the app works

- **Signup:** a new member creates an account, fills the full profile, and is `pending`.
- **Approval:** the chapter's Local Admin approves or rejects. If a chapter has no Local Admin, the Super Admin does. Local Admin decisions are written to the Activity Log.
- **Events:** Local Admin and Super Admin can create, edit and delete events. Members RSVP; admins mark attendance. Times are stored in UTC and shown in the viewer's timezone.
- **Feed:** global feed with photos, likes, comments, Offers filter, WhatsApp share. People can delete their own posts and comments; the Super Admin can delete any.
- **Directory:** every approved member's full profile with one-tap Call and WhatsApp.
- **Membership:** everyone renews on 1 January. The Super Admin collects cash offline and marks members renewed (one at a time or several together).
- **Sensitive profile fields:** changing Business Name, Profession or Business Category needs Super Admin approval; everything else saves immediately.
- **Super Admin tools:** Manage Members (edit, move chapter, remove), Chapters (assign, replace or remove the Local Admin), Profile Changes, Membership, Activity Log, direct Add Member.

## Reminder emails (not set up yet)

`supabase/functions/send-reminders` sends membership reminders (15 and 3 days before 1 January) and event reminders (24 hours before). It needs a Resend account, a deployed function and a daily schedule.

## Project layout

```
src/app/
  login, signup, signup/profile, pending-approval, change-password
  forgot-password, reset-password, auth/confirm
  dashboard/
    feed, directory, events (new, [id], [id]/edit), profile
    admin/ (requests, members, chapters, profile-changes, membership, activity, add-member)
src/lib/        supabase clients and the photo compression helper
src/middleware.js   login and approval-status routing
supabase/       schema.sql, migration.sql, reminder function
```
