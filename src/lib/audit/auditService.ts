/**
 * Audit Service
 *
 * Centralized service for writing audit logs.
 * All services must use this service instead of direct database inserts.
 */

import { createClient } from '@/lib/supabase/server';

// ============================================================================
// Types
// ============================================================================

/**
 * Audit action types - represents all possible audit events in the system.
 */
export const AuditAction = {
  // Profile actions
  PROFILE_CREATED: 'PROFILE_CREATED',
  PROFILE_UPDATED: 'PROFILE_UPDATED',
  PROFILE_DELETED: 'PROFILE_DELETED',

  // Organization actions
  ORGANIZATION_CREATED: 'ORGANIZATION_CREATED',
  ORGANIZATION_UPDATED: 'ORGANIZATION_UPDATED',
  ORGANIZATION_DELETED: 'ORGANIZATION_DELETED',

  // Lead actions
  LEAD_CREATED: 'LEAD_CREATED',
  LEAD_UPDATED: 'LEAD_UPDATED',
  LEAD_DELETED: 'LEAD_DELETED',
  LEAD_CONVERTED: 'LEAD_CONVERTED',

  // Contact actions
  CONTACT_CREATED: 'CONTACT_CREATED',
  CONTACT_UPDATED: 'CONTACT_UPDATED',
  CONTACT_DELETED: 'CONTACT_DELETED',

  // Pipeline actions
  PIPELINE_CREATED: 'PIPELINE_CREATED',
  PIPELINE_UPDATED: 'PIPELINE_UPDATED',
  PIPELINE_DELETED: 'PIPELINE_DELETED',

  // Pipeline Stage actions
  PIPELINE_STAGE_CREATED: 'PIPELINE_STAGE_CREATED',
  PIPELINE_STAGE_UPDATED: 'PIPELINE_STAGE_UPDATED',
  PIPELINE_STAGE_DELETED: 'PIPELINE_STAGE_DELETED',

  // Deal actions
  DEAL_CREATED: 'DEAL_CREATED',
  DEAL_UPDATED: 'DEAL_UPDATED',
  DEAL_MOVED: 'DEAL_MOVED',
  DEAL_WON: 'DEAL_WON',
  DEAL_LOST: 'DEAL_LOST',
  DEAL_DELETED: 'DEAL_DELETED',

  // Activity actions
  ACTIVITY_CREATED: 'ACTIVITY_CREATED',
  ACTIVITY_UPDATED: 'ACTIVITY_UPDATED',
  ACTIVITY_DELETED: 'ACTIVITY_DELETED',

  // Team Member actions
  TEAM_MEMBER_ADDED: 'TEAM_MEMBER_ADDED',
  TEAM_MEMBER_REMOVED: 'TEAM_MEMBER_REMOVED',
  TEAM_MEMBER_ROLE_CHANGED: 'TEAM_MEMBER_ROLE_CHANGED',

  // Role actions
  ROLE_CREATED: 'ROLE_CREATED',
  ROLE_UPDATED: 'ROLE_UPDATED',
  ROLE_DELETED: 'ROLE_DELETED',
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

/**
 * Resource types that can be audited.
 */
export const ResourceType = {
  PROFILE: 'profile',
  ORGANIZATION: 'organization',
  LEAD: 'lead',
  CONTACT: 'contact',
  PIPELINE: 'pipeline',
  PIPELINE_STAGE: 'pipeline_stage',
  DEAL: 'deal',
  ACTIVITY: 'activity',
  TEAM_MEMBER: 'team_member',
  ROLE: 'role',
} as const;

export type ResourceType = (typeof ResourceType)[keyof typeof ResourceType];

/**
 * Input for creating an audit log entry.
 */
export interface CreateAuditLogInput {
  organizationId: string;
  actorId: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Error thrown when audit log creation fails.
 */
export class AuditLogError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'AuditLogError';
  }
}

// ============================================================================
// Core Function
// ============================================================================

/**
 * Creates an audit log entry in the database.
 *
 * @param input - The audit log data
 * @throws {AuditLogError} If the database insert fails
 */
export async function createAuditLog(input: CreateAuditLogInput): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('audit_logs')
    .insert({
      organization_id: input.organizationId,
      actor_id: input.actorId,
      action: input.action,
      resource_type: input.resourceType,
      resource_id: input.resourceId,
      before: input.before ?? null,
      after: input.after ?? null,
      ip_address: input.ipAddress ?? null,
    });

  if (error) {
    throw new AuditLogError(
      `Failed to create audit log: ${error.message}`,
      error
    );
  }
}

// ============================================================================
// Convenience Helpers
// ============================================================================

/**
 * Logs a profile creation event.
 */
export async function logProfileCreated(
  organizationId: string,
  actorId: string,
  profileId: string
): Promise<void> => {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.PROFILE_CREATED,
    resourceType: ResourceType.PROFILE,
    resourceId: profileId,
  });
};

/**
 * Logs an organization creation event.
 */
export async function logOrganizationCreated(
  actorId: string,
  organizationId: string
): Promise<void> => {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.ORGANIZATION_CREATED,
    resourceType: ResourceType.ORGANIZATION,
    resourceId: organizationId,
  });
};

// ============================================================================
// Lead Helpers
// ============================================================================

/**
 * Logs a lead creation event.
 */
export async function logLeadCreated(
  organizationId: string,
  actorId: string,
  leadId: string,
  after?: Record<string, unknown>
): Promise<void> => {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.LEAD_CREATED,
    resourceType: ResourceType.LEAD,
    resourceId: leadId,
    after,
  });
};

/**
 * Logs a lead update event.
 */
export async function logLeadUpdated(
  organizationId: string,
  actorId: string,
  leadId: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>
): Promise<void> => {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.LEAD_UPDATED,
    resourceType: ResourceType.LEAD,
    resourceId: leadId,
    before,
    after,
  });
};

/**
 * Logs a lead deletion event.
 */
export async function logLeadDeleted(
  organizationId: string,
  actorId: string,
  leadId: string,
  before?: Record<string, unknown>
): Promise<void> => {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.LEAD_DELETED,
    resourceType: ResourceType.LEAD,
    resourceId: leadId,
    before,
  });
};

/**
 * Logs a lead conversion event.
 */
export async function logLeadConverted(
  organizationId: string,
  actorId: string,
  leadId: string,
  contactId: string
): Promise<void> => {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.LEAD_CONVERTED,
    resourceType: ResourceType.LEAD,
    resourceId: leadId,
    after: { contactId },
  });
};

// ============================================================================
// Contact Helpers
// ============================================================================

/**
 * Logs a contact creation event.
 */
export async function logContactCreated(
  organizationId: string,
  actorId: string,
  contactId: string,
  after?: Record<string, unknown>
): Promise<void> => {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.CONTACT_CREATED,
    resourceType: ResourceType.CONTACT,
    resourceId: contactId,
    after,
  });
};

/**
 * Logs a contact update event.
 */
export async function logContactUpdated(
  organizationId: string,
  actorId: string,
  contactId: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>
): Promise<void> => {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.CONTACT_UPDATED,
    resourceType: ResourceType.CONTACT,
    resourceId: contactId,
    before,
    after,
  });
};

/**
 * Logs a contact deletion event.
 */
export async function logContactDeleted(
  organizationId: string,
  actorId: string,
  contactId: string,
  before?: Record<string, unknown>
): Promise<void> => {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.CONTACT_DELETED,
    resourceType: ResourceType.CONTACT,
    resourceId: contactId,
    before,
  });
};

// ============================================================================
// Pipeline Helpers
// ============================================================================

/**
 * Logs a pipeline creation event.
 */
export async function logPipelineCreated(
  organizationId: string,
  actorId: string,
  pipelineId: string
): Promise<void> => {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.PIPELINE_CREATED,
    resourceType: ResourceType.PIPELINE,
    resourceId: pipelineId,
  });
};

/**
 * Logs a pipeline update event.
 */
export async function logPipelineUpdated(
  organizationId: string,
  actorId: string,
  pipelineId: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>
): Promise<void> => {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.PIPELINE_UPDATED,
    resourceType: ResourceType.PIPELINE,
    resourceId: pipelineId,
    before,
    after,
  });
};

/**
 * Logs a pipeline deletion event.
 */
export async function logPipelineDeleted(
  organizationId: string,
  actorId: string,
  pipelineId: string
): Promise<void> => {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.PIPELINE_DELETED,
    resourceType: ResourceType.PIPELINE,
    resourceId: pipelineId,
  });
};

// ============================================================================
// Pipeline Stage Helpers
// ============================================================================

/**
 * Logs a pipeline stage creation event.
 */
export async function logPipelineStageCreated(
  organizationId: string,
  actorId: string,
  stageId: string
): Promise<void> => {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.PIPELINE_STAGE_CREATED,
    resourceType: ResourceType.PIPELINE_STAGE,
    resourceId: stageId,
  });
};

/**
 * Logs a pipeline stage update event.
 */
export async function logPipelineStageUpdated(
  organizationId: string,
  actorId: string,
  stageId: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>
): Promise<void> => {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.PIPELINE_STAGE_UPDATED,
    resourceType: ResourceType.PIPELINE_STAGE,
    resourceId: stageId,
    before,
    after,
  });
};

/**
 * Logs a pipeline stage deletion event.
 */
export async function logPipelineStageDeleted(
  organizationId: string,
  actorId: string,
  stageId: string
): Promise<void> => {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.PIPELINE_STAGE_DELETED,
    resourceType: ResourceType.PIPELINE_STAGE,
    resourceId: stageId,
  });
};

// ============================================================================
// Deal Helpers
// ============================================================================

/**
 * Logs a deal creation event.
 */
export async function logDealCreated(
  organizationId: string,
  actorId: string,
  dealId: string,
  after?: Record<string, unknown>
): Promise<void> => {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.DEAL_CREATED,
    resourceType: ResourceType.DEAL,
    resourceId: dealId,
    after,
  });
};

/**
 * Logs a deal update event.
 */
export async function logDealUpdated(
  organizationId: string,
  actorId: string,
  dealId: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>
): Promise<void> => {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.DEAL_UPDATED,
    resourceType: ResourceType.DEAL,
    resourceId: dealId,
    before,
    after,
  });
};

/**
 * Logs a deal movement event (stage change).
 */
export async function logDealMoved(
  organizationId: string,
  actorId: string,
  dealId: string,
  fromStageId: string,
  toStageId: string
): Promise<void> => {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.DEAL_MOVED,
    resourceType: ResourceType.DEAL,
    resourceId: dealId,
    before: { stageId: fromStageId },
    after: { stageId: toStageId },
  });
};

/**
 * Logs a deal won event.
 */
export async function logDealWon(
  organizationId: string,
  actorId: string,
  dealId: string
): Promise<void> => {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.DEAL_WON,
    resourceType: ResourceType.DEAL,
    resourceId: dealId,
  });
};

/**
 * Logs a deal lost event.
 */
export async function logDealLost(
  organizationId: string,
  actorId: string,
  dealId: string
): Promise<void> => {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.DEAL_LOST,
    resourceType: ResourceType.DEAL,
    resourceId: dealId,
  });
};

/**
 * Logs a deal deletion event.
 */
export async function logDealDeleted(
  organizationId: string,
  actorId: string,
  dealId: string,
  before?: Record<string, unknown>
): Promise<void> => {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.DEAL_DELETED,
    resourceType: ResourceType.DEAL,
    resourceId: dealId,
    before,
  });
};

// ============================================================================
// Activity Helpers
// ============================================================================

/**
 * Logs an activity creation event.
 */
export async function logActivityCreated(
  organizationId: string,
  actorId: string,
  activityId: string
): Promise<void> => {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.ACTIVITY_CREATED,
    resourceType: ResourceType.ACTIVITY,
    resourceId: activityId,
  });
};

/**
 * Logs an activity update event.
 */
export async function logActivityUpdated(
  organizationId: string,
  actorId: string,
  activityId: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>
): Promise<void> => {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.ACTIVITY_UPDATED,
    resourceType: ResourceType.ACTIVITY,
    resourceId: activityId,
    before,
    after,
  });
};

/**
 * Logs an activity deletion event.
 */
export async function logActivityDeleted(
  organizationId: string,
  actorId: string,
  activityId: string,
  before?: Record<string, unknown>
): Promise<void> => {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.ACTIVITY_DELETED,
    resourceType: ResourceType.ACTIVITY,
    resourceId: activityId,
    before,
  });
};