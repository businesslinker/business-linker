-- ============================================================
-- BUSINESS LINKER — MIGRATION (run ONCE on your existing database)
-- Supabase Dashboard -> SQL Editor -> New query -> paste all -> Run
-- It is safe to run again if something interrupts it.
-- ============================================================

-- 1. Helper functions (these avoid the "infinite recursion" policy error)
create or replace function my_role() returns user_role
language sql security definer stable set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function my_chapter() returns uuid
language sql security definer stable set search_path = public as $$
  select chapter_id from profiles where id = auth.uid();
$$;

-- 2. New activity log types
alter type activity_type add value if not exists 'member_rejected';
alter type activity_type add value if not exists 'event_updated';
alter type activity_type add value if not exists 'event_deleted';

-- 3. Foreign keys: make deletes clean
--    Removing a member removes their posts, comments, likes, RSVPs etc.
--    Deleting an event removes its RSVPs and attendance.
--    Deleting a post removes its likes and comments.
do $$
declare
  t record;
  c record;
begin
  for t in
    select * from (values
      ('rsvps',                   'member_id',      'profiles', 'cascade',  'rsvps_member_id_fkey'),
      ('rsvps',                   'event_id',       'events',   'cascade',  'rsvps_event_id_fkey'),
      ('attendance',              'member_id',      'profiles', 'cascade',  'attendance_member_id_fkey'),
      ('attendance',              'event_id',       'events',   'cascade',  'attendance_event_id_fkey'),
      ('attendance',              'marked_by',      'profiles', 'set null', 'attendance_marked_by_fkey'),
      ('posts',                   'author_id',      'profiles', 'cascade',  'posts_author_id_fkey'),
      ('post_likes',              'post_id',        'posts',    'cascade',  'post_likes_post_id_fkey'),
      ('post_likes',              'member_id',      'profiles', 'cascade',  'post_likes_member_id_fkey'),
      ('post_comments',           'post_id',        'posts',    'cascade',  'post_comments_post_id_fkey'),
      ('post_comments',           'author_id',      'profiles', 'cascade',  'post_comments_author_id_fkey'),
      ('pending_profile_changes', 'profile_id',     'profiles', 'cascade',  'pending_profile_changes_profile_id_fkey'),
      ('reminder_log',            'member_id',      'profiles', 'cascade',  'reminder_log_member_id_fkey'),
      ('activity_log',            'actor_id',       'profiles', 'cascade',  'activity_log_actor_id_fkey'),
      ('events',                  'created_by',     'profiles', 'set null', 'events_created_by_fkey'),
      ('chapters',                'local_admin_id', 'profiles', 'set null', 'fk_local_admin')
    ) as v(tbl, col, ref, act, cname)
  loop
    -- drop whatever foreign key currently exists on this column
    for c in
      select con.conname
      from pg_constraint con
      join pg_class cl on cl.oid = con.conrelid
      join pg_namespace n on n.oid = cl.relnamespace
      join pg_attribute a on a.attrelid = con.conrelid and a.attnum = any (con.conkey)
      where con.contype = 'f'
        and n.nspname = 'public'
        and cl.relname = t.tbl
        and a.attname = t.col
    loop
      execute format('alter table public.%I drop constraint %I', t.tbl, c.conname);
    end loop;

    -- add it back with the delete rule, keeping the same constraint name
    execute format(
      'alter table public.%I add constraint %I foreign key (%I) references public.%I(id) on delete %s',
      t.tbl, t.cname, t.col, t.ref, t.act
    );
  end loop;
end
$$;

-- 4. Feed moderation: delete own comments, Super Admin can delete any post/comment
drop policy if exists "Super admin can delete any post" on posts;
create policy "Super admin can delete any post"
  on posts for delete
  using (my_role() = 'super_admin');

drop policy if exists "Members can delete own comments" on post_comments;
create policy "Members can delete own comments"
  on post_comments for delete
  using (author_id = auth.uid());

drop policy if exists "Super admin can delete any comment" on post_comments;
create policy "Super admin can delete any comment"
  on post_comments for delete
  using (my_role() = 'super_admin');

-- 5. Profile columns a member may update directly
grant update (photo_url, age, education, experience, bio, phone, whatsapp, must_change_password)
  on profiles to authenticated;

-- 6. Photo storage: people may only upload files whose name starts with their own user id
drop policy if exists "Authenticated users can upload photos" on storage.objects;
drop policy if exists "Users can update own photos" on storage.objects;
drop policy if exists "Authenticated users can upload post photos" on storage.objects;
drop policy if exists "Users upload own member photos" on storage.objects;
drop policy if exists "Users update own member photos" on storage.objects;
drop policy if exists "Users upload own post photos" on storage.objects;

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

-- 7. Reminder log: membership reminders use ids like 'jan1-2027', so the column must be text
alter table reminder_log alter column reference_id type text using reference_id::text;
