import { createClient } from '@/lib/supabase/server';
import {
  AuditAction,
  ResourceType,
  createAuditLog,
} from '@/lib/audit/auditService';

/**
 * Thrown when a pipeline with the same name already exists.
 */
export class PipelineAlreadyExistsError extends Error {
  constructor(name: string) {
    super(`Pipeline "${name}" already exists.`);
    this.name = 'PipelineAlreadyExistsError';
  }
}

/**
 * Thrown when pipeline validation fails.
 */
export class PipelineValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PipelineValidationError';
  }
}

/**
 * Thrown when the user is not authenticated.
 */
export class UnauthenticatedError extends Error {
  constructor() {
    super('User is not authenticated.');
    this.name = 'UnauthenticatedError';
  }
}

/**
 * Pipeline service.
 *
 * All operations rely on Supabase RLS.
 */
export class PipelineService {
  /**
   * Creates a new pipeline.
   *
   * @param orgId Organization ID
   * @param payload Pipeline payload
   * @returns Created pipeline ID
   */
  public async createPipeline(
    orgId: string,
    payload: {
      name: string;
      description?: string;
    }
  ): Promise<string> {
    const supabase = await createClient();

    // -------------------------------------------------------------------------
    // Authentication
    // -------------------------------------------------------------------------

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new UnauthenticatedError();
    }

    // -------------------------------------------------------------------------
    // Validation
    // -------------------------------------------------------------------------

    const name = payload.name.trim();

    if (name.length < 3) {
      throw new PipelineValidationError(
        'Pipeline name must contain at least 3 characters.'
      );
    }

    const { data: existingPipeline, error: duplicateError } = await supabase
      .from('pipelines')
      .select('id')
      .eq('organization_id', orgId)
      .eq('name', name)
      .maybeSingle();

    if (duplicateError) {
      throw duplicateError;
    }

    if (existingPipeline) {
      throw new PipelineAlreadyExistsError(name);
    }

    // -------------------------------------------------------------------------
    // Insert
    // -------------------------------------------------------------------------

    const { data: pipeline, error: insertError } = await supabase
      .from('pipelines')
      .insert({
        organization_id: orgId,
        name,
        description: payload.description ?? null,
      })
      .select('id, organization_id, name')
      .single();

    if (insertError || !pipeline) {
      throw new Error(`Failed to create pipeline: ${insertError?.message}`);
    }

    // -------------------------------------------------------------------------
    // Audit
    // -------------------------------------------------------------------------

    await createAuditLog({
      organizationId: orgId,
      actorId: user.id,
      action: AuditAction.PIPELINE_CREATED,
      resourceType: ResourceType.PIPELINE,
      resourceId: pipeline.id,
      after: {
        id: pipeline.id,
        organization_id: pipeline.organization_id,
        name: pipeline.name,
      },
    });

    return pipeline.id;
  }
}