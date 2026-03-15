import type { APIRoute } from "astro";
import { getModuleData, resolveNotification } from "../../../lib/admin/control-plane.mjs";
import { handleAdminError, jsonOk, readJsonBody, requireCsrf, requireIdempotencyKey, withAdminApi } from "../../../lib/admin/http.mjs";

export const prerender = false;

export const GET: APIRoute = withAdminApi("ops.read", async () => jsonOk((await getModuleData("ops")).notifications));

export const POST: APIRoute = withAdminApi("ops.manage", async (context, user) => {
  try {
    requireCsrf(context);
    const idempotencyKey = requireIdempotencyKey(context.request);
    const body = await readJsonBody(context.request);
    const result = await resolveNotification(body.id, { actorId: user.id, idempotencyKey });
    return jsonOk(result.data, { notifications: result.state.notifications.length });
  } catch (error) {
    return handleAdminError(error);
  }
});
