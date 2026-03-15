import type { APIRoute } from "astro";
import { getModuleData, queueAdminJob } from "../../../lib/admin/control-plane.mjs";
import { handleAdminError, jsonOk, readJsonBody, requireCsrf, withAdminApi } from "../../../lib/admin/http.mjs";

export const prerender = false;

export const GET: APIRoute = withAdminApi("ops.read", async () => jsonOk(await getModuleData("ops")));

export const POST: APIRoute = withAdminApi("ops.manage", async (context, user) => {
  try {
    requireCsrf(context);
    const body = await readJsonBody(context.request);
    const result = await queueAdminJob(body, { actorId: user.id });
    return jsonOk(result.data, { jobs: result.state.jobs.length });
  } catch (error) {
    return handleAdminError(error);
  }
});
