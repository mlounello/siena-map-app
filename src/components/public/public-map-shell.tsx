'use client';

import { useMemo, useState } from 'react';

type Poi = {
  id: string;
  title: string;
  description: string | null;
  stop_number: number | null;
  latitude: number;
  longitude: number;
};

export function PublicMapShell({
  displayMode,
  pois,
}: {
  displayMode: 'explore_only' | 'guided_only' | 'both';
  pois: Poi[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const sortedStops = useMemo(
    () => [...pois].sort((a, b) => (a.stop_number ?? 9999) - (b.stop_number ?? 9999)),
    [pois]
  );

  const canShowExplore = displayMode === 'explore_only' || displayMode === 'both';
  const canShowGuided = displayMode === 'guided_only' || displayMode === 'both';
  const activeStop = sortedStops[activeIndex] ?? null;

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-xl border border-black/10 bg-white p-4 lg:col-span-2">
        <h2 className="text-lg font-semibold">Map Canvas</h2>
        <p className="mt-2 text-sm text-black/60">
          Interactive Leaflet rendering is next. This starter shows published POI coordinates and guided
          progression data.
        </p>
        <div className="mt-4 rounded-lg border border-dashed border-black/20 bg-[var(--surface-muted)] p-4 text-sm">
          <p>Explore: {canShowExplore ? 'Enabled' : 'Disabled'}</p>
          <p>Guided Tour: {canShowGuided ? 'Enabled' : 'Disabled'}</p>
          {activeStop ? (
            <p className="mt-2">
              Active stop coordinates: {activeStop.latitude}, {activeStop.longitude}
            </p>
          ) : null}
        </div>
      </div>

      <aside className="rounded-xl border border-black/10 bg-white p-4">
        <h3 className="font-semibold">Stops</h3>
        <div className="mt-3 space-y-2">
          {sortedStops.map((poi, index) => (
            <button
              key={poi.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                index === activeIndex
                  ? 'border-[var(--brand)] bg-[var(--surface-muted)]'
                  : 'border-black/10 bg-white'
              }`}
            >
              <p className="font-medium">
                {poi.stop_number ? `${poi.stop_number}. ` : ''}
                {poi.title}
              </p>
              {poi.description ? <p className="mt-1 text-black/65 line-clamp-2">{poi.description}</p> : null}
            </button>
          ))}
        </div>
      </aside>
    </section>
  );
}
