import type { APIRoute } from "astro";
import { getModuleData } from "../../../lib/admin/control-plane.mjs";
import { withAdminApi, jsonOk } from "../../../lib/admin/http.mjs";

export const prerender = false;

export const GET: APIRoute = withAdminApi("activity.read", async () => jsonOk((await getModuleData("governance")).activity));
