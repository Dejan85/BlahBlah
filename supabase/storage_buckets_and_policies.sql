-- BlahBlah — Storage buckets + Storage RLS policies (T2.3)
--
-- Snapshot živog stanja Supabase Storage-a (projekat whgjngkbhwjnwuupjkxn),
-- povučeno preko psql sa storage.buckets / pg_policies (schema=storage) 2026-06-24.
--
-- ⚠️ ZA VERZIONISANJE / REFERENCU, ne za slepi replay:
--   - bucket-e i politike pravi Supabase preko Dashboard-a / management API-ja;
--     storage.objects RLS već postoji na hostovanom projektu.
--   - Ako bi se ovo ikad reprodukovalo na čistoj bazi, pokrenuti uz postojeću
--     `storage` šemu (Supabase je kreira); `on conflict do nothing` štiti od duplikata.
--
-- Schema-only dump public šeme (17 tabela, 53 RLS, 7 trigera) je u
-- migrations/20260624145146_remote_schema.sql — storage je odvojen jer su
-- bucket-i i njihove politike u `storage` šemi (data, van schema-only dump-a).

-- ─────────────────────────────────────────────────────────────────────────────
-- BUCKETS (4)
-- ─────────────────────────────────────────────────────────────────────────────
-- name           | public | file_size_limit | allowed_mime_types | created
-- avatars        | false  | (none)          | (none)             | 2024-11-25
-- audio-messages | true   | (none)          | (none)             | 2025-01-17
-- chat-files     | true   | (none)          | (none)             | 2025-01-20
-- posts          | true   | (none)          | (none)             | 2025-02-07
insert into storage.buckets (id, name, public) values
  ('avatars',        'avatars',        false),
  ('audio-messages', 'audio-messages', true),
  ('chat-files',     'chat-files',     true),
  ('posts',          'posts',          true)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- STORAGE RLS POLICIES (10) — sve na storage.objects
-- ─────────────────────────────────────────────────────────────────────────────

-- avatars (3) — NAPOMENA: bucket je PRIVATE, ali postoji "publicly accessible"
-- SELECT politika; kod ipak koristi getPublicUrl('avatars') → vidi watch-item u
-- docs/PROJECT_STATUS.md §4 (public URL na privatnom bucket-u ne radi).
create policy "Avatar images are publicly accessible."
  on storage.objects for select to public
  using (bucket_id = 'avatars');
create policy "Anyone can upload an avatar."
  on storage.objects for insert to public
  with check (bucket_id = 'avatars');
create policy "Anyone can update their own avatar."
  on storage.objects for update to public
  using ((select auth.uid()) = owner)
  with check (bucket_id = 'avatars');

-- audio-messages (1)
create policy "Allow public downloads"
  on storage.objects for select to public
  using (bucket_id = 'audio-messages');

-- chat-files (4)
create policy "Give public access to chat-files"
  on storage.objects for select to public
  using (bucket_id = 'chat-files');
create policy "Allow authenticated uploads to chat-files"
  on storage.objects for insert to public
  with check ((bucket_id = 'chat-files') and (auth.role() = 'authenticated'));
create policy "Allow users to update own chat files"
  on storage.objects for update to public
  using ((bucket_id = 'chat-files') and (auth.uid() = owner))
  with check ((bucket_id = 'chat-files') and (auth.uid() = owner));
create policy "Allow users to delete own chat files"
  on storage.objects for delete to public
  using ((bucket_id = 'chat-files') and (auth.uid() = owner));

-- posts (2)
create policy "Authenticated users can read posts"
  on storage.objects for select to authenticated
  using (bucket_id = 'posts');
create policy "Authenticated users can upload posts"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'posts');
