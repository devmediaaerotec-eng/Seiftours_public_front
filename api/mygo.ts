 

const MYGO_URL = 'https://admin.mygo.co/api';

// Read-only endpoints only. BookingCreation must NEVER be exposed here: this proxy is public and
// adds the agency's credentials, so anyone could book rooms on the agency's account.
const ENDPOINTS: Record<string, string> = {
  ListHotel: '/hotel/ListHotel',
  HotelDetail: '/hotel/HotelDetail',
  HotelSearch: '/hotel/HotelSearch',
};

// 12 h fresh, then served stale for up to 24 h while Vercel refreshes it in the background
const CDN_CACHE = 'public, max-age=0, s-maxage=43200, stale-while-revalidate=86400';

const TIMEOUT_MS = 25_000;

/** Same shape as MyGo's own errors, so src/lib/mygoApi.ts shows the message to the visitor. */
const failure = (status: number, description: string) =>
  Response.json(
    { ErrorMessage: { Code: status, Description: description } },
    { status, headers: { 'Cache-Control': 'no-store' } }
  );

async function forward(endpoint: string, body: Record<string, unknown>): Promise<Response> {
  // Local dev: front/public/.env.local · Vercel: Project Settings > Environment Variables
  const login = process.env.MYGO_LOGIN;
  const password = process.env.MYGO_PASSWORD;
  if (!login || !password) {
    console.error('[api/mygo] MYGO_LOGIN / MYGO_PASSWORD are not set on the server');
    return failure(503, 'Le service hôtels est momentanément indisponible. Merci de réessayer plus tard.');
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${MYGO_URL}${ENDPOINTS[endpoint]}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ Credential: { Login: login, Password: password }, ...body }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    console.error(`[api/mygo] ${endpoint}: MyGo unreachable`, error);
    return failure(502, "Le fournisseur d'hôtels ne répond pas. Merci de réessayer dans un instant.");
  }

  const text = await upstream.text();
  // MyGo sometimes answers an HTML error page: never pass that on as JSON
  try {
    JSON.parse(text);
  } catch {
    console.error(`[api/mygo] ${endpoint}: non-JSON answer (HTTP ${upstream.status})`);
    return failure(502, "Réponse invalide du fournisseur d'hôtels. Merci de réessayer dans un instant.");
  }

  return new Response(text, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/** GET /api/mygo?endpoint=ListHotel | GET /api/mygo?endpoint=HotelDetail&id=36 */
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const endpoint = params.get('endpoint');

  let body: Record<string, unknown>;
  if (endpoint === 'ListHotel') {
    body = {};
  } else if (endpoint === 'HotelDetail') {
    const id = Number(params.get('id'));
    if (!Number.isInteger(id) || id <= 0) return Response.json({ error: 'Invalid hotel id' }, { status: 400 });
    body = { Hotel: id };
  } else {
    return Response.json({ error: 'Unknown endpoint' }, { status: 404 });
  }

  const response = await forward(endpoint, body);
  // MyGo reports errors (quota, bad request...) inside a 200 body: never cache those
  const data: any = await response.clone().json().catch(() => null);
  if (response.ok && !(Number(data?.ErrorMessage?.Code) >= 400)) {
    response.headers.set('Cache-Control', CDN_CACHE);
  }
  return response;
}

/** POST /api/mygo { endpoint: "HotelSearch", body: {...} } */
export async function POST(request: Request): Promise<Response> {
  const { endpoint, body } = (await request.json().catch(() => ({}))) as {
    endpoint?: string;
    body?: Record<string, unknown>;
  };
  if (endpoint !== 'HotelSearch') {
    return Response.json({ error: 'Unknown endpoint' }, { status: 404 });
  }
  return forward(endpoint, body ?? {});
}
