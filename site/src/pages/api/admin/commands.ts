import type { APIRoute } from "astro";
import { applyAdminCommand, canRunCommand } from "../../../lib/admin/control-plane.mjs";
import {
  handleAdminError,
  jsonOk,
  readJsonBody,
  requireAdmin,
  requireCsrf,
  requireIdempotencyKey,
} from "../../../lib/admin/http.mjs";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    const user = requireAdmin(context);
    const body = await readJsonBody(context.request);
    if (!canRunCommand(user.role, body.command)) {
      return handleAdminError(Object.assign(new Error("Insufficient permissions"), { statusCode: 403 }));
    }
    requireCsrf(context);

    const idempotencyKey = requireIdempotencyKey(context.request);
    const result = await applyAdminCommand({
      actorId: user.id,
      actorRole: user.role,
      command: body.command,
      entityType: body.entityType || "system",
      entityId: body.entityId || body.command,
      reason: body.reason || "",
      idempotencyKey,
    });

    return jsonOk(result);
  } catch (error) {
    return handleAdminError(error);
  }
};
