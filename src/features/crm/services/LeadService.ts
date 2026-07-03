import { createClient } from '@/lib/supabase/server';
import {
  logLeadCreated,
  createAuditLog,
  AuditAction,
  ResourceType,
} from '@/lib/audit/auditService';

export class LeadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LeadValidationError';
  }
}

export class DuplicateEmailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateEmailError';
  }
}

export class LeadNotFoundError extends Error {
  constructor(leadId: string) {
    super(`Lead '${leadId}' was not found.`);
    this.name = 'LeadNotFoundError';
  }
}

export interface Lead {
  id: string;
  organization_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string | null;
}

export class LeadService {
  /**
   * Creates a new lead.
   */
  public async createLead(
    organizationId: string,
    payload: {
      name: string;
      email?: string;
      phone?: string;
      source?: string;
      status?: string;
      assignedTo?: string | null;
    }
  ): Promise<string> {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthenticated');
    }

    const actorId = user.id;

    this.validateName(payload.name);

    const trimmedName = payload.name.trim();

const email = payload.email?.trim() ?? payload.email;

await this.checkDuplicateEmail(
  email,
  organizationId,
  supabase
);

    const { data, error } = await supabase
      .from('leads')
      .insert({
        organization_id: organizationId,
        name: trimmedName,
        email: email,
        phone: payload.phone,
        source: payload.source,
        status: payload.status ?? 'new',
        assigned_to: payload.assignedTo,
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(
        `Failed to create lead: ${error?.message ?? 'Unknown error'}`
      );
    }

    await logLeadCreated(
      organizationId,
      actorId,
      data.id,
      {
        name: trimmedName,
        email: email,
        phone: payload.phone,
        source: payload.source,
        status: payload.status ?? 'new',
        assignedTo: payload.assignedTo,
      }
    );

    return data.id;
  }
    /**
   * Retrieves a single lead by ID.
   */
  public async getLead(
    leadId: string
  ): Promise<Lead> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new LeadNotFoundError(leadId);
      }

      throw new Error(
        `Failed to retrieve lead: ${error.message}`
      );
    }

    return data as Lead;
  }

  /**
   * Retrieves a paginated list of leads.
   */
  public async getLeads(
    params: {
      organizationId: string;
      page?: number;
      pageSize?: number;
      search?: string;
      status?: string;
    }
  ): Promise<Lead[]> {
    const supabase = await createClient();

    const page = Math.max(params.page ?? 1, 1);
const pageSize = Math.max(params.pageSize ?? 25, 1);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('leads')
      .select('*')
      .eq('organization_id', params.organizationId);

    if (params.status) {
      query = query.eq('status', params.status);
    }

    if (params.search) {
      query = query.ilike('name', `%${params.search}%`);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(
        `Failed to retrieve leads: ${error.message}`
      );
    }

    return (data ?? []) as Lead[];
  }

  /**
   * Updates a lead.
   */
  public async updateLead(
    leadId: string,
    payload: {
      name?: string;
      email?: string;
      phone?: string;
      source?: string;
      status?: string;
      assignedTo?: string | null;
    }
  ): Promise<void> {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthenticated');
    }

    const { data: existingLead, error: getError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (getError) {
      if (getError.code === 'PGRST116') {
        throw new LeadNotFoundError(leadId);
      }

      throw new Error(
        `Failed to retrieve lead: ${getError.message}`
      );
    }

    if (payload.name !== undefined) {
      this.validateName(payload.name);
    }

    const email =
  payload.email?.trim() ?? payload.email;

if (
  email !== undefined &&
  email !== existingLead.email
) {
  await this.checkDuplicateEmail(
    email,
    existingLead.organization_id,
    supabase
  );
}

    const updates: Record<string, unknown> = {};

    if (payload.name !== undefined) {
      updates.name = payload.name.trim();
    }

    if (payload.email !== undefined) {
      updates.email = email;
    }

    if (payload.phone !== undefined) {
      updates.phone = payload.phone;
    }

    if (payload.source !== undefined) {
      updates.source = payload.source;
    }

    if (payload.status !== undefined) {
      updates.status = payload.status;
    }

    if (payload.assignedTo !== undefined) {
      updates.assigned_to = payload.assignedTo;
    }

    if (Object.keys(updates).length === 0) {
      return;
    }

    updates.updated_at = new Date().toISOString();

    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', leadId)
      .eq('organization_id', existingLead.organization_id)
      .select('*')
      .single();

    if (updateError || !updatedLead) {
      throw new Error(
        `Lead update failed: ${updateError?.message ?? 'Unknown error'}`
      );
    }

    await createAuditLog({
      organizationId: existingLead.organization_id,
      actorId: user.id,
      action: AuditAction.LEAD_UPDATED,
      resourceType: ResourceType.LEAD,
      resourceId: leadId,
      before: existingLead,
      after: updatedLead,
    });
  }

  /**
   * Deletes a lead.
   */
  public async deleteLead(leadId: string): Promise<void> {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthenticated');
    }

    const { data: existingLead, error: getError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (getError) {
      if (getError.code === 'PGRST116') {
        throw new LeadNotFoundError(leadId);
      }

      throw new Error(`Failed to retrieve lead: ${getError.message}`);
    }

    const { error: deleteError } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId)
      .eq('organization_id', existingLead.organization_id);

    if (deleteError) {
      throw new Error(`Failed to delete lead: ${deleteError.message}`);
    }

    await createAuditLog({
      organizationId: existingLead.organization_id,
      actorId: user.id,
      action: AuditAction.LEAD_DELETED,
      resourceType: ResourceType.LEAD,
      resourceId: leadId,
      before: existingLead,
    });
  }

  /**
   * Validates the lead name.
   */
  private validateName(name: string): void {
    const trimmed = name.trim();

    if (trimmed.length === 0) {
      throw new LeadValidationError(
        'Lead name cannot be empty.'
      );
    }
  }

  /**
   * Ensures the email is unique within the organization.
   */
  private async checkDuplicateEmail(
    email: string | undefined,
    organizationId: string,
    supabase: Awaited<ReturnType<typeof createClient>>
  ): Promise<void> {
    if (!email) {
      return;
    }

    const { data, error } = await supabase
      .from('leads')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('email', email)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Failed checking duplicate email: ${error.message}`
      );
    }

    if (data) {
      throw new DuplicateEmailError(
        'A lead with this email already exists.'
      );
    }
  }
}

export default LeadService;