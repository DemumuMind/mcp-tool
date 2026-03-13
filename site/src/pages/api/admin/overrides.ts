import type { APIRoute } from "astro";
import { getModuleData, saveOverrideWorkItem } from "../../../lib/admin/control-plane.mjs";
import { handleAdminError, jsonOk, readJsonBody, requireCsrf, withAdminApi } from "../../../lib/admin/http.mjs";

export const prerender = false;

export const GET: APIRoute = withAdminApi("moderation.read", async () => jsonOk(await getModuleData("moderation")));

export const POST: APIRoute = withAdminApi("moderation.edit", async (context, user) => {
  try {
    requireCsrf(context);
    const body = await readJsonBody(context.request);
    const result = await saveOverrideWorkItem(body, { actorId: user.id });
    return jsonOk(result.data, { overrides: result.state.overrideWorkItems.length });
  } catch (error) {
    return handleAdminError(error);
  }
});
