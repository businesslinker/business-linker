# Business Linker

Multi-city business networking community app.
Roles: Super Admin, Local Admin, Member.

## Tech Stack
- Frontend: Next.js (App Router, JavaScript) + Tailwind CSS v4
- Database + Auth + Storage: Supabase
- Hosting: Vercel
- Reminder emails: Resend

## Setup (fresh Supabase + fresh Next.js project)

### 1. Install
```bash
npm install
```

### 2. Supabase project
1. [supabase.com/dashboard](https://supabase.com/dashboard) -> New Project
2. Settings -> API Keys -> copy Project URL, Publishable key, Secret key

### 3. Environment file
```bash
cp .env.local.example .env.local
```
Fill in the 3 Supabase values (Resend key can wait until you set up reminders).

### 4. Run the schema
Supabase Dashboard -> SQL Editor -> New Query -> paste all of `supabase/schema.sql` -> Run.
This creates every table, enables RLS, sets the column-level grants (so members can
only ever edit their own basic fields directly — see "How approvals work" below),
and adds the storage policies.

### 5. Storage bucket
Dashboard -> Storage -> New Bucket -> name: `member-photos` -> **Public bucket: ON**.

### 6. Email confirmation — leave OFF
Authentication -> Settings -> "Enable email confirmations" should be OFF.
Self-signup still goes through a real human approval step (Local Admin or
Super Admin), so email confirmation isn't needed and keeps setup simpler.
If you'd rather require it, you can turn it on later — the app doesn't
depend on it either way.

### 7. Create your own Super Admin account
1. Authentication -> Users -> Add User (Auto Confirm ON) -> your email/password
2. Copy the new user's UID
3. Run the INSERT query at the bottom of `supabase/schema.sql` (fill in your UID/name/email)

### 8. Run locally
```bash
npm run dev
```
Go to `http://localhost:3000/login` and log in with your Super Admin account.

### 9. Deploy
Push to GitHub -> import into Vercel -> add the same environment variables in
Vercel's project settings -> Deploy -> point your Hostinger domain's DNS at
the Vercel deployment (Vercel's own docs walk through the exact A/CNAME
records once you add your custom domain in the Vercel dashboard).

---

## How approvals work (read this before testing)

1. **First, create at least one chapter.** Log in as Super Admin -> Admin -> Chapters -> add a city.
2. **A new member signs up** at `/signup` (email+password), then fills the full
   profile form at `/signup/profile` and picks a chapter. Their profile is
   created with `status = 'pending'`.
3. **Who approves them:**
   - If that chapter already has a Local Admin assigned, the Local Admin sees
     the request under Admin -> Member Requests and can approve/reject it —
     no Super Admin step needed.
   - If the chapter has no Local Admin yet, the request only shows up for the
     Super Admin.
   - The Super Admin can always see and act on every pending request,
     regardless of chapter.
4. **Approving a Local Admin action is logged.** When a Local Admin approves a
   member or creates an event, it's written to the Activity Log so the Super
   Admin has oversight without having to approve everything personally.
5. **To make someone a Local Admin:** they must first be an approved member of
   that chapter. Then Admin -> Chapters -> pick them from the dropdown next to
   that chapter -> Assign.
6. **Editing sensitive fields.** A member can change their photo/bio/education/
   experience/phone/WhatsApp instantly. Changing Business Name, Profession, or
   Business Category submits a request (Admin -> Profile Changes) that only
   the Super Admin can approve — until then, everyone still sees the old
   values. This exists because the group only allows one member per business
   category per chapter; matching duplicates is done manually by the Super
   Admin when reviewing a request.

## Membership renewal

Everyone (Member and Local Admin) renews on a fixed date — **1 January** every
year — rather than an individual anniversary. Super Admin collects payment
offline (cash) and clicks "Mark Renewed" under Admin -> Membership. There is no
in-app payment gateway. Super Admin accounts have no membership/renewal.

## Automatic reminders (optional, set up when ready)

1. Create a [Resend](https://resend.com) account (free tier: 3,000 emails/month)
   -> get an API key -> add it to `.env.local` as `RESEND_API_KEY`.
2. Install the Supabase CLI: `npm install -g supabase`
3. `supabase login` then `supabase link --project-ref your-project-ref`
4. `supabase functions deploy send-reminders`
5. `supabase secrets set RESEND_API_KEY=your_key`
6. Dashboard -> Database -> Extensions -> enable `pg_cron` and `pg_net`
7. SQL Editor:
   ```sql
   select cron.schedule(
     'daily-reminders',
     '0 9 * * *',
     $$
     select net.http_post(
       url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminders',
       headers := jsonb_build_object('Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY')
     );
     $$
   );
   ```
This sends membership reminders 15 and 3 days before every 1 January, and
event reminders 24 hours before each event — `reminder_log` prevents duplicates.

## App Structure

```
src/app/
  login/                        - Login
  signup/                       - Step 1: create account
  signup/profile/                - Step 2: build full profile (submits as 'pending')
  pending-approval/              - Shown while status is pending/rejected
  change-password/               - For admin-added accounts (temp password)
  dashboard/
    layout.js, Nav.js, Avatar.js, ContactButtons.js  - Shared shell + components
    feed/                          - Global feed: post, like, comment
    directory/ , directory/[id]/    - Full-profile directory + Call/WhatsApp
    events/ , events/new/ , events/[id]/  - Events, RSVP, attendance
    profile/                        - Own profile: edit basics, request sensitive changes
    admin/
      page.js                        - Hub (role-scoped links)
      actions.js                     - All privileged server actions
      requests/                      - Approve/reject new members
      chapters/                      - Super admin: create chapters, assign local admins
      profile-changes/               - Super admin: approve sensitive-field edits
      membership/                    - Super admin: 1 Jan renewals
      activity/                      - Super admin: local admin activity log
      add-member/                    - Super admin: direct member add (bypasses signup)
src/lib/
  supabase.js                   - Browser client
  supabase-server.js            - Server client (session-aware)
  supabase-admin.js             - Service-role client (server actions only)
middleware.js                    - Auth guard + profile-completion + approval-status routing
supabase/schema.sql               - Full schema, RLS, column grants, storage policies
supabase/functions/send-reminders/ - Edge Function for automatic reminders
```

## Roles Summary

| Role | Rights |
|---|---|
| **Super Admin** | Full access everywhere, final approval on everything, creates chapters, assigns Local Admins, approves sensitive profile-change requests, does membership renewals, sees the Activity Log, can add members directly |
| **Local Admin** | Approves/rejects new member signups for their own chapter, creates events for their own chapter — both happen immediately, logged to the Activity Log for Super Admin visibility |
| **Member** | Self-signs up, edits own basic profile instantly, requests approval for sensitive fields, views every member's full profile with one-touch Call/WhatsApp, posts to the feed, RSVPs to events |

## Known Gotcha

`profiles` and `chapters` reference each other both ways, so queries need the
explicit constraint name:
- A chapter's local admin: `profiles!fk_local_admin(full_name)`
- A profile's chapter: the default name `profiles_chapter_id_fkey` applies
  automatically wherever you embed `chapters` from `profiles`.
