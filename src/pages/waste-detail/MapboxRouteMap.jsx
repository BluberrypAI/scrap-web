import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { hideRoadNumberShields, styleKoreaMapContext } from '../../lib/mapbox-style.js';
import { routeMapMarkerState, routeMapSegmentState } from './route-visual-state.js';

const KOREA_BOUNDS = [[124.5, 32.8], [132.35, 39.4]];
const KOREA_VIEW_BOUNDS = [[125.5, 33.05], [132.15, 38.55]];
const KOREA_CENTER = [128.25, 36.25];
const fallbackCoordinates = [
  { latitude: 37.16224762, longitude: 126.90491285 },
  { latitude: 37.342, longitude: 127.92 },
  { latitude: 36.642, longitude: 127.489 },
  { latitude: 36.351, longitude: 127.385 },
];

function coordinatesOf(value, fallbackIndex = 0) {
  const fallback = fallbackCoordinates[Math.min(fallbackIndex, fallbackCoordinates.length - 1)];
  return {
    latitude: Number(value?.latitude ?? value?.lat ?? fallback.latitude),
    longitude: Number(value?.longitude ?? value?.lng ?? fallback.longitude),
  };
}

function createFactoryMarker(stop, state, isCurrent, isProcessing) {
  const marker = document.createElement('div');
  marker.className = `mapbox-route-marker is-${state}${isCurrent ? ' is-current' : ''}${isProcessing ? ' is-processing' : ''}`;
  marker.setAttribute('aria-label', stop.mapLabel || stop.label);

  const factory = document.createElement('span');
  factory.className = 'mapbox-route-marker-factory';
  factory.innerHTML = `<img src="${isCurrent
    ? '/images/map-factory-active.png'
    : '/images/map-factory.png'}" alt="" aria-hidden="true"><i></i><i></i><i></i>`;
  factory.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.className = 'mapbox-route-marker-label';

  const name = document.createElement('strong');
  name.textContent = stop.mapLabel || stop.label;

  label.append(name);
  marker.append(factory, label);
  return marker;
}

function createTruckMarker(destination) {
  const anchor = document.createElement('div');
  anchor.className = 'mapbox-route-truck-anchor';
  anchor.setAttribute('aria-label', `${destination.mapLabel || destination.label}로 운송 중`);

  const truck = document.createElement('div');
  truck.className = 'mapbox-route-truck';

  const icon = document.createElement('span');
  icon.innerHTML = '<svg viewBox="0 0 32 24" aria-hidden="true"><path d="M2 3h18v14H2z"/><path d="M20 8h5l5 6v3H20z"/><circle cx="8" cy="19" r="3"/><circle cx="25" cy="19" r="3"/></svg>';
  icon.setAttribute('aria-hidden', 'true');
  truck.append(icon);
  anchor.append(truck);
  return anchor;
}

function routeFeatureCollection(routeLines, state) {
  return {
    type: 'FeatureCollection',
    features: routeLines.map((coordinates, index) => ({
      type: 'Feature',
      properties: { state: state(index) },
      geometry: { type: 'LineString', coordinates },
    })),
  };
}

function pointAlongRoute(coordinates, progress) {
  if (!coordinates?.length) return null;
  if (coordinates.length === 1) return coordinates[0];

  const segmentLengths = coordinates.slice(1).map((point, index) => {
    const previous = coordinates[index];
    const latitudeScale = Math.cos(((point[1] + previous[1]) / 2) * Math.PI / 180);
    return Math.hypot(
      (point[0] - previous[0]) * latitudeScale,
      point[1] - previous[1],
    );
  });
  const totalLength = segmentLengths.reduce((sum, length) => sum + length, 0);
  if (!totalLength) return coordinates[0];

  let remaining = totalLength * progress;
  for (let index = 0; index < segmentLengths.length; index += 1) {
    const segmentLength = segmentLengths[index];
    if (remaining <= segmentLength || index === segmentLengths.length - 1) {
      const ratio = segmentLength ? Math.min(1, remaining / segmentLength) : 0;
      const from = coordinates[index];
      const to = coordinates[index + 1];
      return [
        from[0] + ((to[0] - from[0]) * ratio),
        from[1] + ((to[1] - from[1]) * ratio),
      ];
    }
    remaining -= segmentLength;
  }
  return coordinates.at(-1);
}

async function fetchRoadRouteLines(points, accessToken, signal) {
  return Promise.all(points.slice(1).map(async (destination, index) => {
    const origin = points[index];
    const coordinateString = `${origin.join(',')};${destination.join(',')}`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinateString}`
      + `?alternatives=false&geometries=geojson&overview=full&access_token=${encodeURIComponent(accessToken)}`;
    try {
      const response = await fetch(url, { signal });
      if (!response.ok) return [origin, destination];
      const payload = await response.json();
      return payload.routes?.[0]?.geometry?.coordinates || [origin, destination];
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
      return [origin, destination];
    }
  }));
}

function addRouteLayers(map, routeData) {
  map.addSource('treatment-route', { type: 'geojson', data: routeData });
  map.addLayer({
    id: 'treatment-route-active-glow',
    type: 'line',
    source: 'treatment-route',
    filter: ['==', ['get', 'state'], 'active'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#d8caeb',
      'line-width': 16,
      'line-blur': 7,
      'line-opacity': 0.34,
    },
  });
  map.addLayer({
    id: 'treatment-route-casing',
    type: 'line',
    source: 'treatment-route',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#ffffff', 'line-width': 10, 'line-opacity': 0.92 },
  });
  map.addLayer({
    id: 'treatment-route-done',
    type: 'line',
    source: 'treatment-route',
    filter: ['==', ['get', 'state'], 'done'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#758d78', 'line-width': 5, 'line-opacity': 0.96 },
  });
  map.addLayer({
    id: 'treatment-route-active',
    type: 'line',
    source: 'treatment-route',
    filter: ['==', ['get', 'state'], 'active'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#b9a3d8', 'line-width': 7, 'line-opacity': 1 },
  });
  map.addLayer({
    id: 'treatment-route-planned',
    type: 'line',
    source: 'treatment-route',
    filter: ['==', ['get', 'state'], 'planned'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#8e8794',
      'line-width': 4,
      'line-opacity': 0.72,
      'line-dasharray': [1.2, 1.8],
    },
  });
}

export function MapboxRouteMap({ stops, origin, phase, activeStopIndex, activeSegmentIndex,
  onLoadStateChange }) {
  const mapHostRef = useRef(null);
  const [loadState, setLoadState] = useState('loading');
  const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim();
  const routeStops = useMemo(() => [{
    kind: 'source',
    label: '화성 배출사업장',
    mapLabel: '화성 배출사업장',
    region: '경기 화성',
    coordinates: origin,
  }, ...stops], [origin, stops]);
  const routeSignature = JSON.stringify(routeStops.map((stop, index) => ({
    key: stop.facility_key || stop.label,
    name: stop.mapLabel || stop.label,
    region: stop.region,
    coordinates: coordinatesOf(stop.coordinates || stop.location, index),
  })));

  useEffect(() => {
    onLoadStateChange?.(loadState);
  }, [loadState, onLoadStateChange]);

  useEffect(() => {
    if (!accessToken) {
      setLoadState('missing-token');
      return undefined;
    }

    let animationFrame;
    let loadTimer;
    let resizeFrame;
    let resizeObserver;
    let cancelled = false;
    let loaded = false;
    const routeAbortController = new AbortController();
    const markers = [];
    const points = routeStops.map((stop, index) => {
      const coordinates = coordinatesOf(stop.coordinates || stop.location, index);
      return [coordinates.longitude, coordinates.latitude];
    });

    mapboxgl.accessToken = accessToken;
    setLoadState('loading');

    if (!mapboxgl.supported()) {
      setLoadState('unsupported');
      return undefined;
    }

    let map;
    try {
      map = new mapboxgl.Map({
        container: mapHostRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: KOREA_CENTER,
        zoom: 5.8,
        minZoom: 5.4,
        maxZoom: 12,
        maxBounds: KOREA_BOUNDS,
        attributionControl: false,
        cooperativeGestures: true,
        antialias: true,
      });
    } catch {
      setLoadState('error');
      return undefined;
    }

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left');
    resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(mapHostRef.current);
    resizeFrame = requestAnimationFrame(() => map.resize());

    const handleError = (event) => {
      if (event?.error) console.error('Mapbox route map error:', event.error);
      if (!cancelled && !loaded) setLoadState('error');
    };
    map.on('error', handleError);
    loadTimer = window.setTimeout(() => {
      if (!cancelled && !loaded) setLoadState('timeout');
    }, 12000);

    map.on('load', async () => {
      if (cancelled) return;
      try {
        loaded = true;
        window.clearTimeout(loadTimer);
        hideRoadNumberShields(map);
        styleKoreaMapContext(map);
        const routeLines = await fetchRoadRouteLines(
          points,
          accessToken,
          routeAbortController.signal,
        );
        if (cancelled) return;
        addRouteLayers(map, routeFeatureCollection(routeLines, (index) => routeMapSegmentState({
          phase, index, activeStopIndex, activeSegmentIndex,
        })));

        routeStops.forEach((stop, index) => {
          const state = routeMapMarkerState({ phase, index, activeStopIndex, activeSegmentIndex });
          const marker = new mapboxgl.Marker({
            element: createFactoryMarker(
              stop,
              state,
              (phase === 'transporting' || phase === 'processing') && state === 'active',
              phase === 'processing' && state === 'active',
            ),
            anchor: 'bottom',
            offset: [0, -7],
          }).setLngLat(points[index]).addTo(map);
          markers.push(marker);
        });

        const compact = mapHostRef.current.clientWidth < 640;
        const routeBounds = points.length > 1
          ? points.reduce((bounds, point) => bounds.extend(point), new mapboxgl.LngLatBounds(points[0], points[0]))
          : KOREA_VIEW_BOUNDS;
        map.fitBounds(routeBounds, {
          padding: compact
            ? { top: 74, right: 74, bottom: 74, left: 74 }
            : { top: 110, right: 150, bottom: 110, left: 150 },
          maxZoom: 7.2,
          duration: globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 850,
        });

        if (phase === 'transporting' && activeSegmentIndex >= 0
          && points[activeSegmentIndex] && points[activeSegmentIndex + 1]) {
          const from = points[activeSegmentIndex];
          const to = points[activeSegmentIndex + 1];
          const activeRoute = routeLines[activeSegmentIndex] || [from, to];
          const truckMarker = new mapboxgl.Marker({
            element: createTruckMarker(routeStops[activeSegmentIndex + 1]),
            anchor: 'center',
          }).setLngLat(from).addTo(map);
          markers.push(truckMarker);

          if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
            truckMarker.setLngLat(pointAlongRoute(activeRoute, 0.5));
          } else {
            const startedAt = performance.now();
            const moveTruck = (now) => {
              if (cancelled) return;
              const rawProgress = ((now - startedAt) % 9000) / 9000;
              const progress = rawProgress < 0.5
                ? 2 * rawProgress * rawProgress
                : 1 - ((-2 * rawProgress + 2) ** 2) / 2;
              truckMarker.setLngLat(pointAlongRoute(activeRoute, progress));
              animationFrame = requestAnimationFrame(moveTruck);
            };
            animationFrame = requestAnimationFrame(moveTruck);
          }
        }

        setLoadState('ready');
      } catch (error) {
        if (cancelled || error?.name === 'AbortError') return;
        console.error('Mapbox route setup error:', error);
        setLoadState('error');
      }
    });

    return () => {
      cancelled = true;
      routeAbortController.abort();
      window.clearTimeout(loadTimer);
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      resizeObserver?.disconnect();
      markers.forEach((marker) => marker.remove());
      map.off('error', handleError);
      map.remove();
    };
  }, [accessToken, routeSignature, phase, activeStopIndex, activeSegmentIndex]);

  return <div className="mapbox-route-map" data-load-state={loadState}>
    <div className="mapbox-map-canvas" ref={mapHostRef}
      aria-label="Mapbox 지도에 표시한 폐기물 처리 공정 위치와 이동 경로" />
    {loadState !== 'ready' && <div className="route-map-skeleton" aria-hidden="true"><span /></div>}
  </div>;
}
