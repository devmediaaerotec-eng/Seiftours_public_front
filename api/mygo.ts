 

const MYGO_URL = 'https://admin.mygo.co/api';

const ENDPOINTS: Record<string, string> = {
  ListHotel: '/hotel/ListHotel',
  HotelDetail: '/hotel/HotelDetail',
  HotelSearch: '/hotel/HotelSearch',
  BookingCreation: '/booking/BookingCreation',
};

// 12 h fresh, then served stale for up to 24 h while Vercel refreshes it in the background
const CDN_CACHE = 'public, max-age=0, s-maxage=43200, stale-while-revalidate=86400';

async function forward(endpoint: string, body: Record<string, unknown>): Promise<Response> {
  const login = process.env.MYGO_LOGIN;
  const password = process.env.MYGO_PASSWORD;
  if (!login || !password) {
    return Response.json({ error: 'MYGO_LOGIN / MYGO_PASSWORD are not set on the server' }, { status: 500 });
  }

  const upstream = await fetch(`${MYGO_URL}${ENDPOINTS[endpoint]}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ Credential: { Login: login, Password: password }, ...body }),
  });

  return new Response(await upstream.text(), {
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

/** POST /api/mygo { endpoint: "HotelSearch" | "BookingCreation", body: {...} } */
export async function POST(request: Request): Promise<Response> {
  const { endpoint, body } = (await request.json().catch(() => ({}))) as {
    endpoint?: string;
    body?: Record<string, unknown>;
  };
  if (endpoint !== 'HotelSearch' && endpoint !== 'BookingCreation') {
    return Response.json({ error: 'Unknown endpoint' }, { status: 404 });
  }
  return forward(endpoint, body ?? {});
}
