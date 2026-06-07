-- 008_make_profile_organization_id_nullable.sql
-- Make organization_id nullable in profiles
ALTER TABLE public.profiles
ALTER COLUMN organization_id DROP NOT NULL;