import process from "node:process";
import { setAdminUserPassword } from "../site/src/lib/admin/session.mjs";

function getArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

const email = getArg("--email");
const password = getArg("--password");

if (!email || !password) {
  console.error("Usage: npm run admin:set-password -- --email owner@demumumind.internal --password <new-password>");
  process.exit(1);
}

try {
  const user = await setAdminUserPassword(email, password);
  console.log(`Updated admin password for ${user.email} (${user.role})`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Unable to update admin password");
  process.exit(1);
}
