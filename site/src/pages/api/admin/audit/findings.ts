import type { APIRoute } from "astro";
import { getModuleData, saveAuditFinding } from "../../../../lib/admin/control-plane.mjs";
import { handleAdminError, jsonOk, readJsonBody, requireCsrf, withAdminApi } from "../../../../lib/admin/http.mjs";

export const prerender = false;

export const GET: APIRoute = withAdminApi("quality.read", async () => jsonOk(await getModuleData("quality")));

export const POST: APIRoute = withAdminApi("quality.manage", async (context, user) => {
  try {
    requireCsrf(context);
    const body = await readJsonBody(context.request);
    const result = await saveAuditFinding(body, { actorId: user.id });
    return jsonOk(result.data, { findings: result.state.auditFindings.length });
  } catch (error) {
    return handleAdminError(error);
  }
});
