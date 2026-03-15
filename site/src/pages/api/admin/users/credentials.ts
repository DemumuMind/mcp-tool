import type { APIRoute } from "astro";
import { handleAdminError, jsonOk, readJsonBody, requireAdmin, requireCsrf } from "../../../../lib/admin/http.mjs";
import { setAdminUserPassword } from "../../../../lib/admin/session.mjs";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    requireAdmin(context, "settings.manageUsers");
    requireCsrf(context);

    const body = await readJsonBody(context.request);
    if (!body.email || !body.password) {
      const error = new Error("Both email and password are required");
      error.statusCode = 400;
      throw error;
    }

    const user = await setAdminUserPassword(body.email, body.password);
    return jsonOk({ user });
  } catch (error) {
    return handleAdminError(error);
  }
};
