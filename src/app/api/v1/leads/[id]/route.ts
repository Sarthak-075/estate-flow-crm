import { withApiHandler } from "@/lib/api/handler";
import { success } from "@/lib/api/responses";
import { BadRequestError } from "@/lib/api/errors";
import LeadService from "@/features/crm/services/LeadService";

export const dynamic = "force-dynamic";

function extractLeadId(request: Request): string {
  return request.url.split("/").filter(Boolean).pop() ?? "";
}

export const PATCH = withApiHandler(async (_ctx, request) => {
  const leadId = extractLeadId(request);

  if (!leadId) {
    throw new BadRequestError("Lead ID is required");
  }

  const body = await request.json().catch(() => ({}));

  await new LeadService().updateLead(
    leadId,
    body as Parameters<LeadService["updateLead"]>[1],
  );

  return success({ updated: true, id: leadId });
});

export const DELETE = withApiHandler(async (_ctx, request) => {
  const leadId = extractLeadId(request);

  if (!leadId) {
    throw new BadRequestError("Lead ID is required");
  }

  await new LeadService().deleteLead(leadId);

  return success({ deleted: true, id: leadId });
});
