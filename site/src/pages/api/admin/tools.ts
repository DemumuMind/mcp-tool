import type { APIRoute } from "astro";
import { getModuleData, saveCatalogDraft } from "../../../lib/admin/control-plane.mjs";
import { handleAdminError, jsonOk, readJsonBody, requireCsrf, withAdminApi } from "../../../lib/admin/http.mjs";

export const prerender = false;

export const GET: APIRoute = withAdminApi("catalog.read", async () => jsonOk(await getModuleData("catalog")));

export const POST: APIRoute = withAdminApi("catalog.edit", async (context, user) => {
  try {
    requireCsrf(context);
    const body = await readJsonBody(context.request);
    const wantsReview = body.submitForReview === true || body.submitForReview === "true";
    const result = await saveCatalogDraft(
      {
        ...body,
        status: wantsReview ? "in_review" : body.status || "draft",
      },
      { actorId: user.id }
    );

    return jsonOk(result.data, { tools: result.state.tools.length, drafts: result.state.catalogDrafts.length });
  } catch (error) {
    return handleAdminError(error);
  }
});
