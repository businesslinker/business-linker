-- ============================================================
-- BUSINESS LINKER — COMPLETE DATABASE SCHEMA (v3)
-- Supabase SQL Editor mein ye poori file ek saath run karein.
-- ============================================================

-- ---------------- ENUMS ----------------
create type user_role as enum ('super_admin', 'local_admin', 'member');
create type profile_status as enum ('pending', 'approved', 'rejected');
create type rsvp_status as enum ('going', 'not_going', 'maybe');
create type request_status as enum ('pending', 'approved', 'rejected');
create type activity_type as enum ('member_approved', 'event_created');
create type reminder_type as enum ('membership_15day', 'membership_3day', 'event_reminder');

-- ---------------- CHAPTERS (cities) ----------------
create table chapters (
  id uuid primary key default gen_random_uuid(),
  city_name text not null unique,
  local_admin_id uuid,
  created_at timestamptz default now()
);

-- ---------------- PROFILES (extends auth.users) ----------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'member',
  status profile_status not null default 'pending',
  full_name text not null,
  email text,
  age int,
  photo_url text,
  chapter_id uuid references chapters(id),
  business_name text,
  profession text,
  business_category text,
  education text,
  experience text,
  bio text,
  phone text,
  whatsapp text,
  membership_paid_through_year int,
  must_change_password boolean not null default false,
  created_at timestamptz default now()
);

alter table chapters add constraint fk_local_admin
  foreign key (local_admin_id) references profiles(id);

-- ---------------- PENDING PROFILE CHANGES (sensitive fields) ----------------
create table pending_profile_changes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) not null,
  requested_business_name text,
  requested_profession text,
  requested_business_category text,
  status request_status not null default 'pending',
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

-- ---------------- EVENTS ----------------
create table events (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid references chapters(id) not null,
  title text not null,
  description text,
  event_date timestamptz not null,
  venue text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ---------------- RSVPs ----------------
create table rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) not null,
  member_id uuid references profiles(id) not null,
  status rsvp_status not null,
  responded_at timestamptz default now(),
  unique(event_id, member_id)
);

-- ---------------- ATTENDANCE ----------------
create table attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) not null,
  member_id uuid references profiles(id) not null,
  attended boolean default false,
  marked_by uuid references profiles(id),
  marked_at timestamptz default now(),
  unique(event_id, member_id)
);

-- ---------------- FEED: POSTS / LIKES / COMMENTS ----------------
create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references profiles(id) not null,
  content text not null,
  tag text,
  created_at timestamptz default now()
);

create table post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) not null,
  member_id uuid references profiles(id) not null,
  created_at timestamptz default now(),
  unique(post_id, member_id)
);

create table post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) not null,
  author_id uuid references profiles(id) not null,
  content text not null,
  created_at timestamptz default now()
);

-- ---------------- ACTIVITY LOG (local admin actions, for super admin oversight) ----------------
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id) not null,
  action_type activity_type not null,
  reference_id uuid,
  chapter_id uuid references chapters(id),
  description text,
  created_at timestamptz default now()
);

-- ---------------- REMINDER LOG (dedupe automatic reminders) ----------------
create table reminder_log (
  id uuid primary key default gen_random_uuid(),
  reminder_type reminder_type not null,
  reference_id uuid not null,
  member_id uuid references profiles(id) not null,
  sent_at timestamptz default now(),
  channel text
);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================
alter table chapters enable row level security;
alter table profiles enable row level security;
alter table pending_profile_changes enable row level security;
alter table events enable row level security;
alter table rsvps enable row level security;
alter table attendance enable row level security;
alter table posts enable row level security;
alter table post_likes enable row level security;
alter table post_comments enable row level security;
alter table activity_log enable row level security;
alter table reminder_log enable row level security;

-- ============================================================
-- COLUMN-LEVEL PRIVILEGES ON PROFILES
-- A logged-in member can only ever UPDATE these specific columns directly
-- from the browser/client. Sensitive fields (business_name, profession,
-- business_category), role, status, chapter_id, membership_paid_through_year
-- can only be changed by server actions using the service-role key
-- (which bypasses grants entirely), never by a regular user's own session.
-- ============================================================
revoke update on profiles from authenticated;
grant update (photo_url, age, education, experience, bio, phone, whatsapp) on profiles to authenticated;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- PROFILES
-- Approved profiles are visible to everyone logged in (directory).
-- A user can also always see their own row (even while pending/rejected),
-- and admins can see pending profiles in their scope for approval screens.
create policy "View approved, own, or admin-scoped profiles"
  on profiles for select
  using (
    status = 'approved'
    or id = auth.uid()
    or exists (
      select 1 from profiles p
      where p.id = auth.uid()
      and (p.role = 'super_admin' or (p.role = 'local_admin' and p.chapter_id = profiles.chapter_id))
    )
  );

create policy "Self-signup creates own pending member row"
  on profiles for insert
  with check (auth.uid() = id and status = 'pending' and role = 'member');

create policy "Users can update own profile (grant-limited columns)"
  on profiles for update
  using (auth.uid() = id);

-- CHAPTERS
create policy "Anyone logged in can view chapters"
  on chapters for select
  using (auth.uid() is not null);
-- No client insert/update/delete policy — chapters are only ever
-- created/edited via server actions using the service-role key.

-- PENDING PROFILE CHANGES
create policy "Members can request own sensitive-field changes"
  on pending_profile_changes for insert
  with check (profile_id = auth.uid());

create policy "View own or admin-visible change requests"
  on pending_profile_changes for select
  using (
    profile_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and role = 'super_admin')
  );

-- EVENTS
create policy "Anyone logged in can view events"
  on events for select
  using (auth.uid() is not null);
-- Insert/update happen via server actions (service role) after an
-- authorization check, so no client-side write policy is needed.

-- RSVPs
create policy "Anyone logged in can view rsvps"
  on rsvps for select
  using (auth.uid() is not null);

create policy "Members can RSVP for themselves"
  on rsvps for insert
  with check (member_id = auth.uid());

create policy "Members can change own rsvp"
  on rsvps for update
  using (member_id = auth.uid());

-- ATTENDANCE — marked only via server actions (service role); read is open
create policy "Anyone logged in can view attendance"
  on attendance for select
  using (auth.uid() is not null);

-- POSTS
create policy "Anyone logged in can view posts"
  on posts for select
  using (auth.uid() is not null);

create policy "Members can create own posts"
  on posts for insert
  with check (author_id = auth.uid());

create policy "Members can delete own posts"
  on posts for delete
  using (author_id = auth.uid());

-- POST LIKES
create policy "Anyone logged in can view likes"
  on post_likes for select
  using (auth.uid() is not null);

create policy "Members can like as themselves"
  on post_likes for insert
  with check (member_id = auth.uid());

create policy "Members can unlike their own like"
  on post_likes for delete
  using (member_id = auth.uid());

-- POST COMMENTS
create policy "Anyone logged in can view comments"
  on post_comments for select
  using (auth.uid() is not null);

create policy "Members can comment as themselves"
  on post_comments for insert
  with check (author_id = auth.uid());

-- ACTIVITY LOG — only super admin can read; writes go through service role only
create policy "Only super admin can view activity log"
  on activity_log for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'super_admin')
  );

-- ============================================================
-- STORAGE (member photo uploads)
-- Dashboard -> Storage -> New bucket -> name: member-photos -> Public: ON
-- ============================================================
create policy "Authenticated users can upload photos"
  on storage.objects for insert
  with check (bucket_id = 'member-photos' and auth.uid() is not null);

create policy "Anyone can view photos"
  on storage.objects for select
  using (bucket_id = 'member-photos');

create policy "Users can update own photos"
  on storage.objects for update
  using (bucket_id = 'member-photos' and auth.uid() is not null);

-- ============================================================
-- CREATE YOUR OWN SUPER ADMIN ACCOUNT (do this after running everything above)
-- ============================================================
-- Step A: Supabase Dashboard -> Authentication -> Users -> Add User
--         (email_confirm ON / Auto Confirm User ON) -> create with your email/password
-- Step B: Copy the new user's UID, then run:
--
-- insert into profiles (id, role, status, full_name, email, must_change_password)
-- values (
--   'paste-your-UID-here',
--   'super_admin',
--   'approved',
--   'Your Name',
--   'you@email.com',
--   false
-- );
