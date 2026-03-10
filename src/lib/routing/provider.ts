import type { RoutingProviderRequest, RoutingProviderResponse } from '@/lib/routing/types';
import { routeWithMapbox } from '@/lib/routing/providers/mapbox';

export type RoutingProvider = {
  name: 'mapbox';
  routeSegment: (request: RoutingProviderRequest, timeoutMs: number) => Promise<RoutingProviderResponse>;
};

export function getRoutingProvider(): RoutingProvider {
  const configured = (process.env.ROUTING_PROVIDER || 'mapbox').toLowerCase();

  if (configured !== 'mapbox') {
    return {
      name: 'mapbox',
      routeSegment: routeWithMapbox,
    };
  }

  return {
    name: 'mapbox',
    routeSegment: routeWithMapbox,
  };
}

