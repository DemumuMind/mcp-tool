import type { APIRoute } from "astro";
import { getModuleData, saveCampaign } from "../../../lib/admin/control-plane.mjs";
import { handleAdminError, jsonOk, readJsonBody, requireCsrf, requireIdempotencyKey, withAdminApi } from "../../../lib/admin/http.mjs";

export const prerender = false;

export const GET: APIRoute = withAdminApi("promotions.read", async () => jsonOk(await getModuleData("promotions")));

export const POST: APIRoute = withAdminApi("promotions.manage", async (context, user) => {
  try {
    requireCsrf(context);
    const idempotencyKey = requireIdempotencyKey(context.request);
    const body = await readJsonBody(context.request);
    const result = await saveCampaign(body, { actorId: user.id, idempotencyKey });
    return jsonOk(result.data, { campaigns: result.state.campaigns.length });
  } catch (error) {
    return handleAdminError(error);
  }
});
