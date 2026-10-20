-- ============================================================
-- BUSINESS LINKER — COMPLETE DATABASE SCHEMA (current)
--
-- USE THIS ONLY for a brand-new, empty Supabase project.
-- If your database already exists, run migration.sql instead.
--
-- Supabase Dashboard -> SQL Editor -> New query -> paste all -> Run
-- ============================================================

-- ---------------- ENUMS ----------------
create type user_role as enum ('super_admin', 'local_admin', 'member');
create type profile_status as enum ('pending', 'approved', 'rejected');
create type rsvp_status as enum ('going', 'not_going', 'maybe');
create type request_status as enum ('pending', 'approved', 'rejected');
create type activity_type as enum ('member_approved', 'member_rejected', 'event_created', 'event_updated', 'event_deleted');
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
  foreign key (local_admin_id) references profiles(id) on delete set null;

-- ---------------- HELPER FUNCTIONS (used by policies, avoid recursion) ----------------
create or replace function my_role() returns user_role
language sql security definer stable set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function my_chapter() returns uuid
language sql security definer stable set search_path = public as $$
  select chapter_id from profiles where id = auth.uid();
$$;

-- ---------------- PENDING PROFILE CHANGES (sensitive fields) ----------------
create table pending_profile_changes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade not null,
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
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- ---------------- RSVPs ----------------
create table rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade not null,
  member_id uuid references profiles(id) on delete cascade not null,
  status rsvp_status not null,
  responded_at timestamptz default now(),
  unique(event_id, member_id)
);

-- ---------------- ATTENDANCE ----------------
create table attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade not null,
  member_id uuid references profiles(id) on delete cascade not null,
  attended boolean default false,
  marked_by uuid references profiles(id) on delete set null,
  marked_at timestamptz default now(),
  unique(event_id, member_id)
);

-- ---------------- FEED: POSTS / LIKES / COMMENTS ----------------
create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  tag text,
  photo_url text,
  created_at timestamptz default now()
);

create table post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade not null,
  member_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(post_id, member_id)
);

create table post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade not null,
  author_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

-- ---------------- ACTIVITY LOG (local admin actions, for super admin oversight) ----------------
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id) on delete cascade not null,
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
  reference_id text not null,
  member_id uuid references profiles(id) on delete cascade not null,
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
-- A logged-in member can only ever update these columns directly.
-- Business name / profession / category, role, status, chapter and
-- membership year can only be changed by server actions that use the
-- service-role key.
-- ============================================================
revoke update on profiles from authenticated;
grant update (photo_url, age, education, experience, bio, phone, whatsapp, must_change_password)
  on profiles to authenticated;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- PROFILES
create policy "View approved, own, or admin-scoped profiles"
  on profiles for select
  using (
    status = 'approved'
    or id = auth.uid()
    or my_role() = 'super_admin'
    or (my_role() = 'local_admin' and my_chapter() = profiles.chapter_id)
  );

create policy "Self-signup creates own pending member row"
  on profiles for insert
  with check (auth.uid() = id and status = 'pending' and role = 'member');

create policy "Users can update own profile (grant-limited columns)"
  on profiles for update
  using (auth.uid() = id);

-- CHAPTERS (writes happen only through server actions)
create policy "Anyone logged in can view chapters"
  on chapters for select
  using (auth.uid() is not null);

-- PENDING PROFILE CHANGES
create policy "Members can request own sensitive-field changes"
  on pending_profile_changes for insert
  with check (profile_id = auth.uid());

create policy "View own or super-admin change requests"
  on pending_profile_changes for select
  using (profile_id = auth.uid() or my_role() = 'super_admin');

-- EVENTS (writes happen only through server actions)
create policy "Anyone logged in can view events"
  on events for select
  using (auth.uid() is not null);

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

-- ATTENDANCE (marked only through server actions)
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

create policy "Super admin can delete any post"
  on posts for delete
  using (my_role() = 'super_admin');

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

create policy "Members can delete own comments"
  on post_comments for delete
  using (author_id = auth.uid());

create policy "Super admin can delete any comment"
  on post_comments for delete
  using (my_role() = 'super_admin');

-- ACTIVITY LOG (only super admin can read; writes go through service role)
create policy "Only super admin can view activity log"
  on activity_log for select
  using (my_role() = 'super_admin');

-- ============================================================
-- STORAGE
-- Create two PUBLIC buckets first: Dashboard -> Storage -> New bucket
--   1. member-photos   (Public ON)
--   2. post-photos     (Public ON)
-- ============================================================
create policy "Anyone can view member photos"
  on storage.objects for select
  using (bucket_id = 'member-photos');

create policy "Anyone can view post photos"
  on storage.objects for select
  using (bucket_id = 'post-photos');

create policy "Users upload own member photos"
  on storage.objects for insert
  with check (
    bucket_id = 'member-photos'
    and auth.uid() is not null
    and name like (auth.uid()::text || '-%')
  );

create policy "Users update own member photos"
  on storage.objects for update
  using (
    bucket_id = 'member-photos'
    and name like (auth.uid()::text || '-%')
  );

create policy "Users upload own post photos"
  on storage.objects for insert
  with check (
    bucket_id = 'post-photos'
    and auth.uid() is not null
    and name like (auth.uid()::text || '-%')
  );

-- Optional safety net: 5 MB per file, JPG/PNG/WebP only
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('member-photos', 'post-photos');

-- ============================================================
-- CREATE YOUR OWN SUPER ADMIN ACCOUNT (after everything above has run)
-- ============================================================
-- Step A: Dashboard -> Authentication -> Users -> Add user (Auto Confirm ON)
-- Step B: copy that user's UID and run:
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
