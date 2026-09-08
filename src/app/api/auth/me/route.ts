import { getSession } from "@/lib/auth";
import { jsonErr, jsonOk } from "@/lib/api";

export async function GET() {
  const s = await getSession();
  if (!s) return jsonErr("Kirish talab qilinadi", 401, "UNAUTHORIZED");
  return jsonOk({ user: s });
}
