import { createClient } from '@/lib/supabase/server';
import { createAuditLog, AuditAction, ResourceType } from '@/lib/audit/auditService';

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
  public async createDeal(organizationId: string, payload: CreateDealPayload): Promise<string> {
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

    await this.validateDeal(payload, supabase, organizationId);

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
    const { data, error } = await supabase.from('deals').select('*').eq('id', dealId).single();
    if (error) {
      if (error.code === 'PGRST116') {
        throw new DealNotFoundError(`Deal '${dealId}' was not found.`);
      }
      throw new Error(`Failed to retrieve deal: ${error.message}`);
    }
    return data as Deal;
  }

  public async getDeals(params: {
    organizationId: string;
    page?: number;
    pageSize?: number;
    search?: string;
    pipelineId?: string;
    stageId?: string;
  }): Promise<Deal[]> {
    const supabase = await createClient();

    let query = supabase.from('deals').select('*').eq('organization_id', params.organizationId);

    if (params.pipelineId) {
      query = query.eq('pipeline_id', params.pipelineId);
    }

    if (params.stageId) {
      query = query.eq('stage_id', params.stageId);
    }

    if (params.search) {
      query = query.ilike('name', `%${params.search}%`);
    }

    const page = Math.max(params.page ?? 1, 1);
    const pageSize = Math.max(params.pageSize ?? 25, 1);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await query.order('created_at', { ascending: false }).range(from, to);

    if (error) {
      throw new Error(`Failed to retrieve deals: ${error.message}`);
    }

    return (data ?? []) as Deal[];
  }

  public async updateDeal(
    dealId: string,
    payload: {
      name?: string;
      value?: number;
      pipelineId?: string;
      stageId?: string;
      leadId?: string | null;
      contactId?: string | null;
      expectedCloseDate?: string | null;
      assignedTo?: string | null;
    }
  ): Promise<void> {
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

    // ---------- Retrieve existing deal ----------
    const { data: existingDeal, error: getError } = await supabase
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .single();

    if (getError) {
      if (getError.code === 'PGRST116') {
        throw new DealNotFoundError(`Deal '${dealId}' was not found.`);
      }
      throw new Error(`Failed to retrieve deal: ${getError.message}`);
    }

    // ---------- Build updates object ----------
    const updates: Record<string, unknown> = {};

    // ---------- Validate and map fields ----------
    if (payload.name !== undefined) {
      const trimmed = payload.name.trim();
      if (!trimmed) {
        throw new DealValidationError('Deal name cannot be empty.');
      }
      updates.name = trimmed;
    }

    if (payload.value !== undefined) {
      if (payload.value < 0) {
        throw new DealValidationError('Deal value cannot be negative.');
      }
      updates.value = payload.value;
    }

    if (payload.pipelineId !== undefined) {
      if (payload.pipelineId !== existingDeal.pipeline_id) {
        const { error: pipelineError } = await supabase
          .from('pipelines')
          .select('id')
          .eq('id', payload.pipelineId)
          .eq('organization_id', existingDeal.organization_id)
          .single();

        if (pipelineError) {
          throw new DealValidationError(`Pipeline not found: ${payload.pipelineId}`);
        }
      }
      updates.pipeline_id = payload.pipelineId;
    }

    if (payload.stageId !== undefined) {
      if (payload.stageId !== existingDeal.stage_id) {
        const { error: stageError } = await supabase
          .from('pipeline_stages')
          .select('id')
          .eq('id', payload.stageId)
          .eq('pipeline_id', payload.pipelineId ?? existingDeal.pipeline_id)
          .single();

        if (stageError) {
          throw new DealValidationError(`Stage not found: ${payload.stageId}`);
        }
      }
      updates.stage_id = payload.stageId;
    }

    if (payload.leadId !== undefined) {
      updates.lead_id = payload.leadId;
    }

    if (payload.contactId !== undefined) {
      updates.contact_id = payload.contactId;
    }

    if (payload.expectedCloseDate !== undefined) {
      updates.expected_close_date = payload.expectedCloseDate;
    }

    if (payload.assignedTo !== undefined) {
      updates.assigned_to = payload.assignedTo;
    }

    // ---------- Check if updates exist ----------
    if (Object.keys(updates).length === 0) {
      return;
    }

    // ---------- Add updated_at ----------
    updates.updated_at = new Date().toISOString();

    // ---------- Execute update ----------
    const { data: updatedDeal, error: updateError } = await supabase
      .from('deals')
      .update(updates)
      .eq('id', dealId)
      .eq('organization_id', existingDeal.organization_id)
      .select('*')
      .single();

    if (updateError || !updatedDeal) {
      throw new Error(`Failed to update deal: ${updateError?.message ?? 'Unknown error'}`);
    }

    // ---------- Audit log ----------
    await createAuditLog({
      organizationId: existingDeal.organization_id,
      actorId,
      action: AuditAction.DEAL_UPDATED,
      resourceType: ResourceType.DEAL,
      resourceId: dealId,
      before: existingDeal,
      after: updatedDeal,
    });
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
      throw new DealValidationError('Deal name cannot be empty.');
    }

    if (payload.value !== undefined && payload.value < 0) {
      throw new DealValidationError('Deal value cannot be negative.');
    }

    const { error: pipelineError } = await supabase
      .from('pipelines')
      .select('id')
      .eq('id', payload.pipelineId)
      .eq('organization_id', organizationId)
      .single();

    if (pipelineError) {
      throw new DealValidationError(`Pipeline not found: ${payload.pipelineId}`);
    }

    const { error: stageError } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('id', payload.stageId)
      .eq('pipeline_id', payload.pipelineId)
      .single();

    if (stageError) {
      throw new DealValidationError(`Stage not found: ${payload.stageId}`);
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
        throw new DealValidationError(
          `Contact not found or not in organization: ${payload.contactId}`
        );
      }
    }
  }
}
export default DealService;
