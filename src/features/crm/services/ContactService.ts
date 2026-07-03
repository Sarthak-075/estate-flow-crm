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
   * Retrieves a single contact by ID.
   */
  public async getContact(
    contactId: string
  ): Promise<Contact> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new ContactNotFoundError(contactId);
      }

      throw new Error(
        `Failed to retrieve contact: ${error.message}`
      );
    }

    return data as Contact;
  }

  /**
   * Retrieves a paginated list of contacts.
   */
  public async getContacts(
    params: {
      organizationId: string;
      page?: number;
      pageSize?: number;
      search?: string;
      leadId?: string;
    }
  ): Promise<Contact[]> {
    const supabase = await createClient();

    let query = supabase
      .from('contacts')
      .select('*')
      .eq('organization_id', params.organizationId);

    if (params.leadId) {
  query = query.eq('lead_id', params.leadId);
}

    if (params.search) {
      query = query.or(
        `first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%`
      );
    }

    const page = Math.max(params.page ?? 1, 1);
    const pageSize = Math.max(params.pageSize ?? 25, 1);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to retrieve contacts: ${error.message}`);
    }

    return (data ?? []) as Contact[];
  }

  /**
 * Updates an existing contact.
 */
public async updateContact(
  contactId: string,
  payload: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    title?: string;
    department?: string;
    leadId?: string | null;
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

  const { data: existingContact, error: getError } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single();

  if (getError) {
    if (getError.code === 'PGRST116') {
      throw new ContactNotFoundError(contactId);
    }

    throw new Error(
      `Failed to retrieve contact: ${getError.message}`
    );
  }

  const firstName =
    payload.firstName ?? existingContact.first_name;

  const lastName =
    payload.lastName ?? existingContact.last_name;

  this.validateNames(firstName, lastName);

  const updates: Record<string, unknown> = {};

  if (payload.firstName !== undefined) {
    updates.first_name = payload.firstName.trim();
  }

  if (payload.lastName !== undefined) {
    updates.last_name = payload.lastName.trim();
  }

  if (payload.email !== undefined) {
    const email = payload.email.trim();

    if (email !== existingContact.email) {
      await this.checkDuplicateEmail(
        email,
        existingContact.organization_id,
        supabase
      );
    }

    updates.email = email;
  }

  if (payload.phone !== undefined) {
    updates.phone = payload.phone;
  }

  if (payload.title !== undefined) {
    updates.title = payload.title;
  }

  if (payload.department !== undefined) {
    updates.department = payload.department;
  }

  if (payload.leadId !== undefined) {
    updates.lead_id = payload.leadId;
  }

  if (payload.assignedTo !== undefined) {
    updates.assigned_to = payload.assignedTo;
  }

  if (Object.keys(updates).length === 0) {
    return;
  }

  updates.updated_at = new Date().toISOString();

  const {
    data: updatedContact,
    error: updateError,
  } = await supabase
    .from('contacts')
    .update(updates)
    .eq('id', contactId)
    .eq(
      'organization_id',
      existingContact.organization_id
    )
    .select('*')
    .single();

  if (updateError || !updatedContact) {
    throw new Error(
      `Contact update failed: ${updateError?.message ?? 'Unknown error'}`
    );
  }

  await createAuditLog({
    organizationId: existingContact.organization_id,
    actorId: user.id,
    action: AuditAction.CONTACT_UPDATED,
    resourceType: ResourceType.CONTACT,
    resourceId: contactId,
    before: existingContact,
    after: updatedContact,
  });
}

/**
 * Deletes an existing contact.
 */
public async deleteContact(
  contactId: string
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Unauthenticated');
  }

  const {
    data: existingContact,
    error: getError,
  } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single();

  if (getError) {
    if (getError.code === 'PGRST116') {
      throw new ContactNotFoundError(contactId);
    }

    throw new Error(
      `Failed to retrieve contact: ${getError.message}`
    );
  }

  const { error: deleteError } = await supabase
    .from('contacts')
    .delete()
    .eq('id', contactId)
    .eq(
      'organization_id',
      existingContact.organization_id
    );

  if (deleteError) {
    throw new Error(
      `Failed to delete contact: ${deleteError.message}`
    );
  }

  await createAuditLog({
    organizationId: existingContact.organization_id,
    actorId: user.id,
    action: AuditAction.CONTACT_DELETED,
    resourceType: ResourceType.CONTACT,
    resourceId: contactId,
    before: existingContact,
  });
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