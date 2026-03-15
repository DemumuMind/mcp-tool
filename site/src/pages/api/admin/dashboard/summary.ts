import type { APIRoute } from "astro";
import { buildAdminSnapshot, loadAdminState } from "../../../../lib/admin/control-plane.mjs";
import { withAdminApi, jsonOk } from "../../../../lib/admin/http.mjs";

export const prerender = false;

export const GET: APIRoute = withAdminApi("dashboard.read", async () => jsonOk(buildAdminSnapshot(await loadAdminState())));
