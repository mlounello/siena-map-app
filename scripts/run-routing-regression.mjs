import fs from 'node:fs/promises';
import path from 'node:path';

const argv = new Set(process.argv.slice(2));
const snapshotRequested = argv.has('--snapshot') || String(process.env.ROUTING_REGRESSION_SNAPSHOT || '').toLowerCase() === '1';
const fixturePath = path.resolve(
  process.cwd(),
  process.env.ROUTING_FIXTURE_PATH || 'docs/routing/siena-campus-test-pairs.json'
);
const outputDir = path.resolve(process.cwd(), process.env.ROUTING_OUTPUT_DIR || 'docs/routing');
const outputJsonLatestPath = path.join(outputDir, 'siena-routing-regression-output.latest.json');
const outputSummaryLatestPath = path.join(outputDir, 'siena-routing-regression-summary.latest.md');
const baseUrl = (process.env.ROUTING_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function toNumberOrNull(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function isCoordinate(value) {
  return (
    value &&
    typeof value === 'object' &&
    Number.isFinite(Number(value.lat)) &&
    Number.isFinite(Number(value.lng))
  );
}

function normalizeCases(fixture) {
  const defaultMode = fixture.defaultMode === 'driving' ? 'driving' : 'walking';
  const preferred = Array.isArray(fixture.cases) && fixture.cases.length > 0
    ? fixture.cases
    : Array.isArray(fixture.pairs)
      ? fixture.pairs
      : [];

  return preferred
    .map((item, index) => {
      const id = String(item.id || `CASE_${index + 1}`);
      if (!isCoordinate(item.from) || !isCoordinate(item.to)) return null;
      return {
        id,
        label: String(item.label || id),
        priority: item.priority ? String(item.priority) : 'medium',
        fromName: item.fromName ? String(item.fromName) : null,
        toName: item.toName ? String(item.toName) : null,
        from: {
          lat: Number(item.from.lat),
          lng: Number(item.from.lng),
        },
        to: {
          lat: Number(item.to.lat),
          lng: Number(item.to.lng),
        },
        mode: item.mode === 'driving' ? 'driving' : defaultMode,
        expectedPathNotes: item.expectedPathNotes ? String(item.expectedPathNotes) : null,
        tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag)) : [],
      };
    })
    .filter(Boolean);
}

function classifyCase(result) {
  if (result.error) return 'error';
  if (result.fallback === 'straight' || result.source === 'fallback_straight') return 'fallback';
  if (result.flagged) return 'flagged';
  return 'ok';
}

function summarizeCounts(caseResults) {
  const summary = {
    total: caseResults.length,
    ok: 0,
    flagged: 0,
    fallback: 0,
    error: 0,
  };

  for (const item of caseResults) {
    summary[item.classification] += 1;
  }

  return summary;
}

function formatMeters(value) {
  return value == null ? 'n/a' : `${Math.round(value)}m`;
}

function formatRatio(value) {
  return value == null ? 'n/a' : value.toFixed(2);
}

function buildSummaryMarkdown(payload) {
  const lines = [];
  lines.push('# Siena Routing Regression Summary');
  lines.push('');
  lines.push(`Generated: ${payload.generatedAt}`);
  lines.push(`Fixture: ${payload.fixturePath}`);
  lines.push(`API Base URL: ${payload.apiBaseUrl}`);
  lines.push(`Cases: ${payload.summary.total}`);
  lines.push('');
  lines.push('## Classification Counts');
  lines.push('');
  lines.push(`- ok: ${payload.summary.ok}`);
  lines.push(`- flagged: ${payload.summary.flagged}`);
  lines.push(`- fallback: ${payload.summary.fallback}`);
  lines.push(`- error: ${payload.summary.error}`);
  lines.push('');

  const focus = payload.results.filter((item) => item.classification !== 'ok');
  if (focus.length > 0) {
    lines.push('## Attention Items');
    lines.push('');
    for (const item of focus) {
      const reasons = item.flag_reasons.length > 0 ? item.flag_reasons.join(', ') : 'none';
      const fallbackReason = item.fallback_reason || 'n/a';
      lines.push(`- ${item.id} (${item.classification}) ${item.label}`);
      lines.push(`  - source: ${item.source ?? 'n/a'} | fallback: ${item.fallback} (${fallbackReason})`);
      lines.push(`  - direct: ${formatMeters(item.direct_distance_meters)} | route: ${formatMeters(item.route_distance_meters)} | detour: ${formatRatio(item.detour_ratio)}`);
      lines.push(`  - snap start/end: ${formatMeters(item.snap_distance_meters_start)} / ${formatMeters(item.snap_distance_meters_end)}`);
      lines.push(`  - flag reasons: ${reasons}`);
      if (item.warnings.length > 0) {
        lines.push(`  - warnings: ${item.warnings.join(', ')}`);
      }
    }
    lines.push('');
  }

  lines.push('## Per-Case Table');
  lines.push('');
  lines.push('| ID | Classification | Source | Direct | Route | Detour | Snap Start | Snap End | Flag Reasons |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const item of payload.results) {
    lines.push(
      `| ${item.id} | ${item.classification} | ${item.source ?? 'n/a'} | ${formatMeters(item.direct_distance_meters)} | ${formatMeters(item.route_distance_meters)} | ${formatRatio(item.detour_ratio)} | ${formatMeters(item.snap_distance_meters_start)} | ${formatMeters(item.snap_distance_meters_end)} | ${item.flag_reasons.join(', ') || 'none'} |`
    );
  }
  lines.push('');

  return lines.join('\n');
}

async function runCase(caseItem) {
  const payload = {
    mode: caseItem.mode,
    debug: true,
    segments: [
      {
        id: caseItem.id,
        from: caseItem.from,
        to: caseItem.to,
      },
    ],
  };

  const startedAt = Date.now();
  const endpoint = `${baseUrl}/api/routing/segments?debug=1`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-routing-debug': 'true',
      },
      body: JSON.stringify(payload),
    });

    const elapsedMs = Date.now() - startedAt;
    const json = await res.json().catch(() => null);

    if (!res.ok || !json) {
      return {
        id: caseItem.id,
        label: caseItem.label,
        priority: caseItem.priority,
        mode: caseItem.mode,
        fromName: caseItem.fromName,
        toName: caseItem.toName,
        expectedPathNotes: caseItem.expectedPathNotes,
        tags: caseItem.tags,
        classification: 'error',
        routed: false,
        fallback: 'none',
        source: null,
        flagged: false,
        flag_reasons: [],
        warnings: [],
        direct_distance_meters: null,
        route_distance_meters: null,
        detour_ratio: null,
        snap_distance_meters_start: null,
        snap_distance_meters_end: null,
        fallback_reason: null,
        duration_seconds: null,
        error: json?.error || `HTTP_${res.status}`,
        http_status: res.status,
        elapsed_ms: elapsedMs,
      };
    }

    const result = Array.isArray(json.results)
      ? json.results.find((entry) => entry.id === caseItem.id) || json.results[0]
      : null;

    if (!result) {
      return {
        id: caseItem.id,
        label: caseItem.label,
        priority: caseItem.priority,
        mode: caseItem.mode,
        fromName: caseItem.fromName,
        toName: caseItem.toName,
        expectedPathNotes: caseItem.expectedPathNotes,
        tags: caseItem.tags,
        classification: 'error',
        routed: false,
        fallback: 'none',
        source: null,
        flagged: false,
        flag_reasons: [],
        warnings: [],
        direct_distance_meters: null,
        route_distance_meters: null,
        detour_ratio: null,
        snap_distance_meters_start: null,
        snap_distance_meters_end: null,
        fallback_reason: null,
        duration_seconds: null,
        error: 'MISSING_RESULT',
        http_status: res.status,
        elapsed_ms: elapsedMs,
      };
    }

    const diagnostics = result.diagnostics || {};
    const normalized = {
      id: caseItem.id,
      label: caseItem.label,
      priority: caseItem.priority,
      mode: caseItem.mode,
      fromName: caseItem.fromName,
      toName: caseItem.toName,
      expectedPathNotes: caseItem.expectedPathNotes,
      tags: caseItem.tags,
      routed: Boolean(result.routed),
      fallback: result.fallback === 'straight' ? 'straight' : 'none',
      source: result.source || diagnostics.provider || null,
      flagged: Boolean(diagnostics.flagged),
      flag_reasons: Array.isArray(diagnostics.flag_reasons) ? diagnostics.flag_reasons : [],
      warnings: Array.isArray(diagnostics.warnings) ? diagnostics.warnings : [],
      direct_distance_meters: toNumberOrNull(diagnostics.direct_distance_meters),
      route_distance_meters: toNumberOrNull(diagnostics.route_distance_meters),
      detour_ratio: toNumberOrNull(diagnostics.detour_ratio),
      snap_distance_meters_start: toNumberOrNull(diagnostics.snap_distance_meters_start),
      snap_distance_meters_end: toNumberOrNull(diagnostics.snap_distance_meters_end),
      fallback_reason: diagnostics.fallback_reason || result.errorCode || null,
      duration_seconds: toNumberOrNull(diagnostics.duration_seconds),
      error: null,
      http_status: res.status,
      elapsed_ms: elapsedMs,
      diagnostics,
    };

    return {
      ...normalized,
      classification: classifyCase(normalized),
    };
  } catch (error) {
    return {
      id: caseItem.id,
      label: caseItem.label,
      priority: caseItem.priority,
      mode: caseItem.mode,
      fromName: caseItem.fromName,
      toName: caseItem.toName,
      expectedPathNotes: caseItem.expectedPathNotes,
      tags: caseItem.tags,
      classification: 'error',
      routed: false,
      fallback: 'none',
      source: null,
      flagged: false,
      flag_reasons: [],
      warnings: [],
      direct_distance_meters: null,
      route_distance_meters: null,
      detour_ratio: null,
      snap_distance_meters_start: null,
      snap_distance_meters_end: null,
      fallback_reason: null,
      duration_seconds: null,
      error: error instanceof Error ? error.message : 'REQUEST_ERROR',
      http_status: null,
      elapsed_ms: null,
    };
  }
}

async function main() {
  const fixtureRaw = await fs.readFile(fixturePath, 'utf8');
  const fixture = JSON.parse(fixtureRaw);
  const cases = normalizeCases(fixture);

  if (cases.length === 0) {
    throw new Error('No valid routing cases found in fixture.');
  }

  const results = [];
  for (const caseItem of cases) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await runCase(caseItem));
  }

  const output = {
    generatedAt: new Date().toISOString(),
    fixturePath: path.relative(process.cwd(), fixturePath),
    apiBaseUrl: baseUrl,
    mode: fixture.defaultMode === 'driving' ? 'driving' : 'walking',
    summary: summarizeCounts(results),
    results,
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputJsonLatestPath, JSON.stringify(output, null, 2));

  const summaryMarkdown = buildSummaryMarkdown(output);
  await fs.writeFile(outputSummaryLatestPath, summaryMarkdown);

  if (snapshotRequested) {
    const stamp = nowStamp();
    const snapshotJson = path.join(outputDir, `siena-routing-regression-output.${stamp}.json`);
    const snapshotMd = path.join(outputDir, `siena-routing-regression-summary.${stamp}.md`);
    await fs.writeFile(snapshotJson, JSON.stringify(output, null, 2));
    await fs.writeFile(snapshotMd, summaryMarkdown);
    console.log(`Snapshot files written:\n- ${snapshotJson}\n- ${snapshotMd}`);
  }

  console.log(`Regression run complete:\n- ${outputJsonLatestPath}\n- ${outputSummaryLatestPath}`);
}

await main();
