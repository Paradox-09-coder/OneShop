const BASE = "https://loving-healing-production-3c2d.up.railway.app";
async function main() {
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: process.env.SEED_ADMIN_USERNAME, password: process.env.SEED_ADMIN_PASSWORD }),
  });
  const cookie = loginRes.headers.get("set-cookie").split(";")[0];
  const r = await fetch(`${BASE}/api/counterparties?type=SUPPLIER`, { headers: { Cookie: cookie } });
  const parties = (await r.json())?.data?.parties ?? [];
  console.log(JSON.stringify(parties, null, 2));
}
main().catch(e => console.error(e));
