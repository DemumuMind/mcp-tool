import type { APIRoute } from "astro";
import { ROLE_CAPABILITIES, getModuleData } from "../../../../lib/admin/control-plane.mjs";
import { withAdminApi, jsonOk } from "../../../../lib/admin/http.mjs";

export const prerender = false;

export const GET: APIRoute = withAdminApi("settings.manageUsers", async () =>
  jsonOk({
    users: (await getModuleData("settings")).users,
    roles: ROLE_CAPABILITIES,
  })
);
