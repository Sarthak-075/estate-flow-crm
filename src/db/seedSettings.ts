import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Seed default organization settings for every organization.
 * If a settings row already exists for an organization it is left untouched.
 */
async function seedSettings() {
  const { data: orgs, error: orgErr } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .limit(1000);
  if (orgErr) throw orgErr;

  const settings: {
    organization_id: string;
    timezone: string;
    business_hours: { start: string; end: string };
    sla_first_response_minutes: number;
    sla_followup_minutes: number;
    branding: unknown;
  }[] = [];
  for (const org of orgs ?? []) {
    settings.push({
      organization_id: org.id,
      timezone: 'UTC',
      business_hours: { start: '09:00', end: '18:00' },
      sla_first_response_minutes: 30,
      sla_followup_minutes: 1440,
      branding: null,
    });
  }

  const { error } = await supabaseAdmin
    .from('organization_settings')
    .upsert(settings, { onConflict: 'organization_id' });
  if (error) throw error;
  console.log('Seeded organization settings for', orgs?.length ?? 0, 'organizations');
}

seedSettings();
