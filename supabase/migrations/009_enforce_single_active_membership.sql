CREATE UNIQUE INDEX IF NOT EXISTS
team_members_one_active_membership_idx
ON public.team_members(profile_id)
WHERE status = 'active';