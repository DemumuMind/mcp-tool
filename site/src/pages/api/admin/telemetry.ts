import type { APIRoute } from "astro";
import { getModuleData, saveTelemetrySnapshot } from "../../../lib/admin/control-plane.mjs";
import { handleAdminError, jsonOk, readJsonBody, requireCsrf, requireIdempotencyKey, withAdminApi } from "../../../lib/admin/http.mjs";

export const prerender = false;

export const GET: APIRoute = withAdminApi("telemetry.read", async () => jsonOk(await getModuleData("telemetry")));

export const POST: APIRoute = withAdminApi("telemetry.manage", async (context, user) => {
  try {
    requireCsrf(context);
    const idempotencyKey = requireIdempotencyKey(context.request);
    const body = await readJsonBody(context.request);
    const result = await saveTelemetrySnapshot(body, { actorId: user.id, idempotencyKey });
    return jsonOk(result.data, { snapshots: result.state.telemetrySnapshots.length });
  } catch (error) {
    return handleAdminError(error);
  }
});
