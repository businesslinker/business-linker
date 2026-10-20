-- OPTIONAL — run this SEPARATELY, after migration.sql has succeeded.
-- Caps every uploaded photo at 5 MB and allows only JPG / PNG / WebP.
-- (The app already shrinks photos before upload, this is a safety net.)

update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('member-photos', 'post-photos');
