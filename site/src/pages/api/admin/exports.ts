import type { APIRoute } from "astro";
import { buildPublicArtifactPreview, getModuleData, loadAdminState } from "../../../lib/admin/control-plane.mjs";
import { withAdminApi, jsonOk } from "../../../lib/admin/http.mjs";

export const prerender = false;

export const GET: APIRoute = withAdminApi("exports.manage", async () =>
  jsonOk({
    releases: (await getModuleData("governance")).exports,
    preview: buildPublicArtifactPreview(await loadAdminState()),
  })
);
