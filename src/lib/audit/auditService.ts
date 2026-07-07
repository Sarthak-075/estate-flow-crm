// src/lib/audit/auditService.ts

import { createClient } from "@/lib/supabase/server";

/**
 * Every auditable action in the system.
 */
export enum AuditAction {
  PROFILE_CREATED = "PROFILE_CREATED",
  PROFILE_UPDATED = "PROFILE_UPDATED",

  ORGANIZATION_CREATED = "ORGANIZATION_CREATED",
  ORGANIZATION_UPDATED = "ORGANIZATION_UPDATED",

  TEAM_MEMBER_CREATED = "TEAM_MEMBER_CREATED",
  TEAM_MEMBER_UPDATED = "TEAM_MEMBER_UPDATED",
  TEAM_MEMBER_REMOVED = "TEAM_MEMBER_REMOVED",

  ROLE_CREATED = "ROLE_CREATED",
  ROLE_UPDATED = "ROLE_UPDATED",
  ROLE_DELETED = "ROLE_DELETED",

  LEAD_CREATED = "LEAD_CREATED",
  LEAD_UPDATED = "LEAD_UPDATED",
  LEAD_DELETED = "LEAD_DELETED",

  CONTACT_CREATED = "CONTACT_CREATED",
  CONTACT_UPDATED = "CONTACT_UPDATED",
  CONTACT_DELETED = "CONTACT_DELETED",

  PIPELINE_CREATED = "PIPELINE_CREATED",
  PIPELINE_UPDATED = "PIPELINE_UPDATED",
  PIPELINE_DELETED = "PIPELINE_DELETED",

  PIPELINE_STAGE_CREATED = "PIPELINE_STAGE_CREATED",
  PIPELINE_STAGE_UPDATED = "PIPELINE_STAGE_UPDATED",
  PIPELINE_STAGE_DELETED = "PIPELINE_STAGE_DELETED",

  DEAL_CREATED = "DEAL_CREATED",
  DEAL_UPDATED = "DEAL_UPDATED",
  DEAL_DELETED = "DEAL_DELETED",

  DEAL_MOVED = "DEAL_MOVED",
  DEAL_WON = "DEAL_WON",
  DEAL_LOST = "DEAL_LOST",

  ACTIVITY_CREATED = "ACTIVITY_CREATED",
  ACTIVITY_UPDATED = "ACTIVITY_UPDATED",
  ACTIVITY_DELETED = "ACTIVITY_DELETED",
}

/**
 * Resources that can be audited.
 */
export enum ResourceType {
  PROFILE = "profile",
  ORGANIZATION = "organization",

  TEAM_MEMBER = "team_member",
  ROLE = "role",

  LEAD = "lead",
  CONTACT = "contact",

  PIPELINE = "pipeline",
  PIPELINE_STAGE = "pipeline_stage",

  DEAL = "deal",
  ACTIVITY = "activity",
}

/**
 * Payload accepted by createAuditLog().
 */
export interface CreateAuditLogInput {
  organizationId: string;
  actorId: string;

  action: AuditAction;

  resourceType: ResourceType;
  resourceId: string;

  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;

  ipAddress?: string | null;
}

/**
 * Audit service specific error.
 */
export class AuditLogError extends Error {
  public readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);

    this.name = "AuditLogError";
    this.cause = cause;
  }
}

/**
 * Writes a single audit log entry.
 *
 * All application services should use this function instead of writing
 * directly to the audit_logs table.
 */
export async function createAuditLog(
  input: CreateAuditLogInput,
): Promise<void> {
  const supabase = await createClient();

  const {
    organizationId,
    actorId,
    action,
    resourceType,
    resourceId,
    before = null,
    after = null,
    ipAddress = null,
  } = input;

  const { error } = await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_id: actorId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    before,
    after,
    ip_address: ipAddress,
  });

  if (error) {
    throw new AuditLogError(
      `Failed to create audit log: ${error.message}`,
      error,
    );
  }
}
// ============================================================================
// Profile
// ============================================================================

export async function logProfileCreated(
  organizationId: string,
  actorId: string,
  profileId: string,
  after?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.PROFILE_CREATED,
    resourceType: ResourceType.PROFILE,
    resourceId: profileId,
    after,
  });
}

export async function logProfileUpdated(
  organizationId: string,
  actorId: string,
  profileId: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.PROFILE_UPDATED,
    resourceType: ResourceType.PROFILE,
    resourceId: profileId,
    before,
    after,
  });
}

// ============================================================================
// Organization
// ============================================================================

export async function logOrganizationCreated(
  organizationId: string,
  actorId: string,
  after?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.ORGANIZATION_CREATED,
    resourceType: ResourceType.ORGANIZATION,
    resourceId: organizationId,
    after,
  });
}

export async function logOrganizationUpdated(
  organizationId: string,
  actorId: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.ORGANIZATION_UPDATED,
    resourceType: ResourceType.ORGANIZATION,
    resourceId: organizationId,
    before,
    after,
  });
}

// ============================================================================
// Leads
// ============================================================================

export async function logLeadCreated(
  organizationId: string,
  actorId: string,
  leadId: string,
  after?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.LEAD_CREATED,
    resourceType: ResourceType.LEAD,
    resourceId: leadId,
    after,
  });
}

export async function logLeadUpdated(
  organizationId: string,
  actorId: string,
  leadId: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.LEAD_UPDATED,
    resourceType: ResourceType.LEAD,
    resourceId: leadId,
    before,
    after,
  });
}

export async function logLeadDeleted(
  organizationId: string,
  actorId: string,
  leadId: string,
  before?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.LEAD_DELETED,
    resourceType: ResourceType.LEAD,
    resourceId: leadId,
    before,
  });
}

// ============================================================================
// Contacts
// ============================================================================

export async function logContactCreated(
  organizationId: string,
  actorId: string,
  contactId: string,
  after?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.CONTACT_CREATED,
    resourceType: ResourceType.CONTACT,
    resourceId: contactId,
    after,
  });
}

export async function logContactUpdated(
  organizationId: string,
  actorId: string,
  contactId: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.CONTACT_UPDATED,
    resourceType: ResourceType.CONTACT,
    resourceId: contactId,
    before,
    after,
  });
}

export async function logContactDeleted(
  organizationId: string,
  actorId: string,
  contactId: string,
  before?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.CONTACT_DELETED,
    resourceType: ResourceType.CONTACT,
    resourceId: contactId,
    before,
  });
}
// ============================================================================
// Pipelines
// ============================================================================

export async function logPipelineCreated(
  organizationId: string,
  actorId: string,
  pipelineId: string,
  after?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.PIPELINE_CREATED,
    resourceType: ResourceType.PIPELINE,
    resourceId: pipelineId,
    after,
  });
}

export async function logPipelineUpdated(
  organizationId: string,
  actorId: string,
  pipelineId: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.PIPELINE_UPDATED,
    resourceType: ResourceType.PIPELINE,
    resourceId: pipelineId,
    before,
    after,
  });
}

export async function logPipelineDeleted(
  organizationId: string,
  actorId: string,
  pipelineId: string,
  before?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.PIPELINE_DELETED,
    resourceType: ResourceType.PIPELINE,
    resourceId: pipelineId,
    before,
  });
}

// ============================================================================
// Pipeline Stages
// ============================================================================

export async function logPipelineStageCreated(
  organizationId: string,
  actorId: string,
  stageId: string,
  after?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.PIPELINE_STAGE_CREATED,
    resourceType: ResourceType.PIPELINE_STAGE,
    resourceId: stageId,
    after,
  });
}

export async function logPipelineStageUpdated(
  organizationId: string,
  actorId: string,
  stageId: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.PIPELINE_STAGE_UPDATED,
    resourceType: ResourceType.PIPELINE_STAGE,
    resourceId: stageId,
    before,
    after,
  });
}

export async function logPipelineStageDeleted(
  organizationId: string,
  actorId: string,
  stageId: string,
  before?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.PIPELINE_STAGE_DELETED,
    resourceType: ResourceType.PIPELINE_STAGE,
    resourceId: stageId,
    before,
  });
}

// ============================================================================
// Deals
// ============================================================================

export async function logDealCreated(
  organizationId: string,
  actorId: string,
  dealId: string,
  after?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.DEAL_CREATED,
    resourceType: ResourceType.DEAL,
    resourceId: dealId,
    after,
  });
}

export async function logDealUpdated(
  organizationId: string,
  actorId: string,
  dealId: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.DEAL_UPDATED,
    resourceType: ResourceType.DEAL,
    resourceId: dealId,
    before,
    after,
  });
}

export async function logDealDeleted(
  organizationId: string,
  actorId: string,
  dealId: string,
  before?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.DEAL_DELETED,
    resourceType: ResourceType.DEAL,
    resourceId: dealId,
    before,
  });
}

export async function logDealMoved(
  organizationId: string,
  actorId: string,
  dealId: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.DEAL_MOVED,
    resourceType: ResourceType.DEAL,
    resourceId: dealId,
    before,
    after,
  });
}

export async function logDealWon(
  organizationId: string,
  actorId: string,
  dealId: string,
  after?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.DEAL_WON,
    resourceType: ResourceType.DEAL,
    resourceId: dealId,
    after,
  });
}

export async function logDealLost(
  organizationId: string,
  actorId: string,
  dealId: string,
  after?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.DEAL_LOST,
    resourceType: ResourceType.DEAL,
    resourceId: dealId,
    after,
  });
}

// ============================================================================
// Activities
// ============================================================================

export async function logActivityCreated(
  organizationId: string,
  actorId: string,
  activityId: string,
  after?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.ACTIVITY_CREATED,
    resourceType: ResourceType.ACTIVITY,
    resourceId: activityId,
    after,
  });
}

export async function logActivityUpdated(
  organizationId: string,
  actorId: string,
  activityId: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.ACTIVITY_UPDATED,
    resourceType: ResourceType.ACTIVITY,
    resourceId: activityId,
    before,
    after,
  });
}

export async function logActivityDeleted(
  organizationId: string,
  actorId: string,
  activityId: string,
  before?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.ACTIVITY_DELETED,
    resourceType: ResourceType.ACTIVITY,
    resourceId: activityId,
    before,
  });
}

// ============================================================================
// Team Members
// ============================================================================

export async function logTeamMemberCreated(
  organizationId: string,
  actorId: string,
  memberId: string,
  after?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.TEAM_MEMBER_CREATED,
    resourceType: ResourceType.TEAM_MEMBER,
    resourceId: memberId,
    after,
  });
}

export async function logTeamMemberUpdated(
  organizationId: string,
  actorId: string,
  memberId: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.TEAM_MEMBER_UPDATED,
    resourceType: ResourceType.TEAM_MEMBER,
    resourceId: memberId,
    before,
    after,
  });
}

export async function logTeamMemberRemoved(
  organizationId: string,
  actorId: string,
  memberId: string,
  before?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.TEAM_MEMBER_REMOVED,
    resourceType: ResourceType.TEAM_MEMBER,
    resourceId: memberId,
    before,
  });
}

// ============================================================================
// Roles
// ============================================================================

export async function logRoleCreated(
  organizationId: string,
  actorId: string,
  roleId: string,
  after?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.ROLE_CREATED,
    resourceType: ResourceType.ROLE,
    resourceId: roleId,
    after,
  });
}

export async function logRoleUpdated(
  organizationId: string,
  actorId: string,
  roleId: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.ROLE_UPDATED,
    resourceType: ResourceType.ROLE,
    resourceId: roleId,
    before,
    after,
  });
}

export async function logRoleDeleted(
  organizationId: string,
  actorId: string,
  roleId: string,
  before?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    organizationId,
    actorId,
    action: AuditAction.ROLE_DELETED,
    resourceType: ResourceType.ROLE,
    resourceId: roleId,
    before,
  });
}
