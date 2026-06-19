-- Run this in the Supabase SQL editor for the XirAI project.
-- It creates a public bucket for generated images and lets signed-in users
-- upload only into their own generated/<user-id>/... folder.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'xirai-generated-images',
  'xirai-generated-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "XirAI generated images are public"
on storage.objects
for select
to public
using (bucket_id = 'xirai-generated-images');

create policy "XirAI users can upload generated images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'xirai-generated-images'
  and (storage.foldername(name))[1] = 'generated'
  and (storage.foldername(name))[2] = auth.uid()::text
);
