import { createClient } from '@/lib/supabase/server';
import {
  createAuditLog,
  AuditAction,
  ResourceType,
} from '@/lib/audit/auditService';

export class ContactValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContactValidationError';
  }
}

export class DuplicateEmailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateEmailError';
  }
}

export class ContactNotFoundError extends Error {
  constructor(contactId: string) {
    super(`Contact '${contactId}' was not found.`);
    this.name = 'ContactNotFoundError';
  }
}

export interface Contact {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  department: string | null;
  lead_id: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string | null;
}

export class ContactService {
  /**
   * Creates a new contact.
   */
  public async createContact(
    organizationId: string,
    payload: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      title?: string;
      department?: string;
      leadId?: string | null;
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

    // Validate names
    this.validateNames(payload.firstName, payload.lastName);

    const trimmedFirstName = payload.firstName.trim();
    const trimmedLastName = payload.lastName.trim();
    const trimmedEmail = payload.email?.trim();

    // Check for duplicate email
    await this.checkDuplicateEmail(
      trimmedEmail,
      organizationId,
      supabase
    );

    // Insert contact
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        organization_id: organizationId,
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        email: trimmedEmail,
        phone: payload.phone,
        title: payload.title,
        department: payload.department,
        lead_id: payload.leadId,
        assigned_to: payload.assignedTo,
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(
        `Failed to create contact: ${error?.message ?? 'Unknown error'}`
      );
    }

    // Audit log
    await createAuditLog({
      organizationId,
      actorId,
      action: AuditAction.CONTACT_CREATED,
      resourceType: ResourceType.CONTACT,
      resourceId: data.id,
      after: {
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        email: trimmedEmail,
        phone: payload.phone,
        title: payload.title,
        department: payload.department,
        leadId: payload.leadId,
        assignedTo: payload.assignedTo,
      },
    });

    return data.id;
  }

  /**
   * Validates first and last names.
   */
  private validateNames(firstName: string, lastName: string): void {
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (trimmedFirst.length === 0) {
      throw new ContactValidationError(
        'First name cannot be empty.'
      );
    }

    if (trimmedLast.length === 0) {
      throw new ContactValidationError(
        'Last name cannot be empty.'
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
      .from('contacts')
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
        'A contact with this email already exists.'
      );
    }
  }
}

export default ContactService;