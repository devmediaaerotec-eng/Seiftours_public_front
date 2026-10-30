// Smoke test for the MyGo proxy (api/mygo.ts) against a running server.
// Usage: npm run dev, then: npm run test:smoke [-- http://localhost:5173]
// Note: each run spends 1 of MyGo's ListHotel calls (100/day) when no CDN cache is in front.
import assert from 'node:assert/strict';

const BASE = process.argv[2] ?? 'http://localhost:5173';
const API = `${BASE}/api/mygo`;
const post = (endpoint, body) =>
  fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint, body }) });

const test = async (name, fn) => {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (e) {
    process.exitCode = 1;
    console.log(`FAIL ${name}: ${e.message}`);
  }
};

let ids = [];

await test('ListHotel returns hotels and is CDN-cacheable', async () => {
  const r = await fetch(`${API}?endpoint=ListHotel`);
  assert.equal(r.status, 200);
  assert.match(r.headers.get('cache-control') ?? '', /s-maxage=/);
  const d = await r.json();
  assert.ok(d.ListHotel?.length > 0, JSON.stringify(d.ErrorMessage));
  ids = d.ListHotel.map((h) => h.Id);
});

await test('HotelDetail returns the hotel', async () => {
  const r = await fetch(`${API}?endpoint=HotelDetail&id=${ids[0]}`);
  const d = await r.json();
  assert.ok(!(Number(d.ErrorMessage?.Code) >= 400), JSON.stringify(d.ErrorMessage));
  assert.equal(d.HotelDetail?.Id, ids[0]);
  assert.ok(d.HotelDetail.Name);
});

await test('HotelSearch returns offers with room cancellation policies', async () => {
  const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
  const r = await post('HotelSearch', {
    SearchDetails: {
      BookingDetails: { CheckIn: day(30), CheckOut: day(32), Hotels: ids.slice(0, 40) },
      Filters: { Keywords: '', Category: [], OnlyAvailable: true, Tags: [] },
      Rooms: [{ Adult: 2 }],
    },
  });
  const d = await r.json();
  assert.ok(Array.isArray(d.HotelSearch), JSON.stringify(d.ErrorMessage));
  const room = d.HotelSearch[0]?.Price?.Boarding?.[0]?.Pax?.[0]?.Rooms?.[0];
  if (room) assert.ok(Array.isArray(room.CancellationPolicy));
  assert.equal(r.headers.get('cache-control'), 'no-store');
});

await test('rejects bad hotel id', async () => {
  assert.equal((await fetch(`${API}?endpoint=HotelDetail&id=abc`)).status, 400);
});

await test('rejects endpoints outside the allowlist', async () => {
  assert.equal((await fetch(`${API}?endpoint=BookingList`)).status, 404);
  assert.equal((await post('BookingCancellation', { BookingReference: 'x' })).status, 404);
});
