import { createClient } from '@/lib/supabase/server';
import {
  createAuditLog,
  AuditAction,
  ResourceType,
} from '@/lib/audit/auditService';

export class DealValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DealValidationError';
  }
}

export class DealNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DealNotFoundError';
  }
}

type CreateDealPayload = {
  name: string;
  value?: number;
  pipelineId: string;
  stageId: string;
  leadId?: string | null;
  contactId?: string | null;
  expectedCloseDate?: string | null;
  assignedTo?: string | null;
};

export interface Deal {
  id?: string;
  organization_id: string;
  name: string;
  value?: number;
  pipeline_id?: string | null;
  stage_id?: string | null;
  lead_id?: string | null;
  contact_id?: string | null;
  expected_close_date?: string | null;
  assigned_to?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Service handling deal (pipeline opportunity) operations.
 */
export class DealService {
  /**
   * Creates a new deal for the given organization.
   *
   * @param organizationId - UUID of the organization.
   * @param payload        Deal payload.
   * @returns               The newly created deal ID.
   */
  public async createDeal(
  organizationId: string,
  payload: CreateDealPayload
): Promise<string> {
    const supabase = await createClient();

    // ---------- Authentication ----------
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthenticated');
    }
    const actorId = user.id;

    await this.validateDeal(
  payload,
  supabase,
  organizationId
);

const trimmedName = payload.name.trim();

    // ---------- Build insert payload ----------
    const insertPayload = {
      organization_id: organizationId,
      name: trimmedName,
      value: payload.value ?? null,
      pipeline_id: payload.pipelineId,
      stage_id: payload.stageId,
      lead_id: payload.leadId ?? null,
      contact_id: payload.contactId ?? null,
      expected_close_date: payload.expectedCloseDate ?? null,
      assigned_to: payload.assignedTo ?? null,
    };

    // ---------- Insert deal ----------
    const { data: insertedDeal, error: insertError } = await supabase
      .from('deals')
      .insert(insertPayload)
      .select('id')
      .single();

    if (insertError) {
      throw new Error(`Failed to create deal: ${insertError.message}`);
    }

    const dealId = insertedDeal.id;

    // ---------- Audit log ----------
    await createAuditLog({
      organizationId,
      actorId,
      action: AuditAction.DEAL_CREATED,
      resourceType: ResourceType.DEAL,
      resourceId: dealId,
      after: {
        ...insertPayload,
        id: dealId,
      },
    });

    return dealId;
  }

  public async getDeal(dealId: string): Promise<Deal> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .eq('id', dealId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') {
      throw new DealNotFoundError(`Deal '${dealId}' was not found.`);
    }
    throw new Error(`Failed to retrieve deal: ${error.message}`);
  }
  return data as Deal;
}

  // -----------------------------------------------------------------
  // Private helpers (mirroring ContactService pattern)
  // -----------------------------------------------------------------
  private async validateDeal(
  payload: CreateDealPayload,
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string
): Promise<void> {
    // Additional validation could be added here if needed.
    // Example: verify lead/contact belong to the organization.
    if (!payload.name.trim()) {
  throw new DealValidationError(
    'Deal name cannot be empty.'
  );
}

if (
  payload.value !== undefined &&
  payload.value < 0
) {
  throw new DealValidationError(
    'Deal value cannot be negative.'
  );
}

const { error: pipelineError } = await supabase
  .from('pipelines')
  .select('id')
  .eq('id', payload.pipelineId)
  .eq('organization_id', organizationId)
  .single();

if (pipelineError) {
  throw new DealValidationError(
    `Pipeline not found: ${payload.pipelineId}`
  );
}

const { error: stageError } = await supabase
  .from('pipeline_stages')
  .select('id')
  .eq('id', payload.stageId)
  .eq('pipeline_id', payload.pipelineId)
  .single();

if (stageError) {
  throw new DealValidationError(
    `Stage not found: ${payload.stageId}`
  );
}

    if (payload.leadId) {
      const { error } = await supabase
        .from('leads')
        .select('id')
        .eq('id', payload.leadId)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        throw new DealValidationError(`Lead not found or not in organization: ${payload.leadId}`);
      }
    }

    if (payload.contactId) {
      const { error } = await supabase
        .from('contacts')
        .select('id')
        .eq('id', payload.contactId)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        throw new DealValidationError(`Contact not found or not in organization: ${payload.contactId}`);
      }
    }
  }
}
export default DealService;