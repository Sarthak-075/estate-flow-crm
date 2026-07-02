import { createClient } from '@/lib/supabase/server';
import {
  logLeadCreated,
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

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthenticated');
    }

    const actorId = user.id;

    // Validate input
    this.validateName(payload.name);

    const trimmedName = payload.name.trim();

    await this.checkDuplicateEmail(
      payload.email,
      organizationId,
      supabase
    );

    // Insert lead
    const { data, error } = await supabase
      .from('leads')
      .insert({
        organization_id: organizationId,
        name: trimmedName,
        email: payload.email,
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

    // Audit log
    await logLeadCreated(
      organizationId,
      actorId,
      data.id,
      {
        name: trimmedName,
        email: payload.email,
        phone: payload.phone,
        source: payload.source,
        status: payload.status ?? 'new',
        assignedTo: payload.assignedTo,
      }
    );

    return data.id;
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