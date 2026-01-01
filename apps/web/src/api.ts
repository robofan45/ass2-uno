const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function api(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("ff_token");
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {})
    }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
