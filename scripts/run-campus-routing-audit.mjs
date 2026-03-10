import fs from 'node:fs/promises';
import path from 'node:path';

const token = process.env.MAPBOX_ACCESS_TOKEN;
if (!token) {
  console.error('Missing MAPBOX_ACCESS_TOKEN');
  process.exit(1);
}

const fixturePath = path.resolve(process.cwd(), 'docs/routing/siena-campus-test-pairs.json');
const outputPath = path.resolve(process.cwd(), 'docs/routing/siena-routing-audit-output.json');

const fixtureRaw = await fs.readFile(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureRaw);
const pairs = Array.isArray(fixture.pairs) ? fixture.pairs : [];

async function routeWalking(pair) {
  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/walking/${pair.from.lng},${pair.from.lat};${pair.to.lng},${pair.to.lat}`
  );
  url.searchParams.set('geometries', 'geojson');
  url.searchParams.set('overview', 'full');
  url.searchParams.set('steps', 'false');
  url.searchParams.set('alternatives', 'false');
  url.searchParams.set('access_token', token);

  const startedAt = Date.now();
  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  const elapsedMs = Date.now() - startedAt;

  if (!res.ok) {
    return {
      id: pair.id,
      label: pair.label,
      status: 'error',
      httpStatus: res.status,
      elapsedMs,
      error: `HTTP_${res.status}`,
    };
  }

  const payload = await res.json();
  const route = payload?.routes?.[0];
  const coords = route?.geometry?.coordinates;
  const hasGeometry = Array.isArray(coords) && coords.length >= 2;

  return {
    id: pair.id,
    label: pair.label,
    status: hasGeometry ? 'routed' : 'fallback_needed',
    elapsedMs,
    distanceMeters: Number.isFinite(Number(route?.distance)) ? Number(route.distance) : null,
    durationSeconds: Number.isFinite(Number(route?.duration)) ? Number(route.duration) : null,
    coordinateCount: hasGeometry ? coords.length : 0,
    expectedPathNotes: pair.expectedPathNotes ?? null,
  };
}

const results = [];
for (const pair of pairs) {
  try {
    // eslint-disable-next-line no-await-in-loop
    results.push(await routeWalking(pair));
  } catch (error) {
    results.push({
      id: pair.id,
      label: pair.label,
      status: 'error',
      error: error instanceof Error ? error.message : 'UNKNOWN',
    });
  }
}

const output = {
  generatedAt: new Date().toISOString(),
  fixture: 'docs/routing/siena-campus-test-pairs.json',
  provider: 'mapbox',
  mode: 'walking',
  totalPairs: pairs.length,
  routed: results.filter((r) => r.status === 'routed').length,
  issues: results.filter((r) => r.status !== 'routed').length,
  results,
};

await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
console.log(`Audit complete. Output: ${outputPath}`);

