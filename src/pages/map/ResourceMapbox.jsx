import { useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { DOKDO_COORDINATE } from '../../lib/mapbox-style.js';

const KOREA_CENTER = [128.25, 36.25];
// MapLibre v6 workers must be emitted by Vite, including the worker's imports.
maplibregl.setWorkerUrl(maplibreWorkerUrl);
const KOREA_BOUNDS = [[124.5, 32.8], [132.35, 39.4]];
const KOREA_VIEW = [[125.5, 33.05], [132.15, 38.55]];

function createCompassMarker(factory, onSelect) {
  const marker = document.createElement('button');
  marker.type = 'button';
  marker.className = 'resource-compass-marker';
  marker.setAttribute('aria-label', `${factory.name}, ${factory.location}`);

  const image = document.createElement('img');
  image.src = '/images/scrap-compass-2d-purple.png';
  image.alt = '';
  image.setAttribute('aria-hidden', 'true');

  const name = document.createElement('strong');
  name.textContent = factory.name;
  marker.append(image, name);
  marker.addEventListener('click', () => onSelect(factory.id));
  return marker;
}

// 출발 사업장 표시 (처리 경로 화면에서 씀). 순환자원지도 화면은 origin 없이 그대로 쓴다
function createOriginMarker(origin) {
  const marker = document.createElement('div');
  marker.className = 'resource-origin-marker';
  marker.setAttribute('aria-label', origin.label || '출발 사업장');
  const dot = document.createElement('span');
  const name = document.createElement('strong');
  name.textContent = origin.label || '우리 사업장';
  marker.append(dot, name);
  return marker;
}

export function ResourceMapbox({ factories, selectedId, focusId, onSelect, origin = null, routePoints = [], onPick, label = '전국 순환자원 처리업체 위치 지도', onStateChange }) {
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  const markerRefs = useRef(new Map());
  const onSelectRef = useRef(onSelect);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const [loadState, setLoadState] = useState('loading');
  const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim();
  const signature = useMemo(() => factories.map((factory) => [
    factory.id, factory.longitude, factory.latitude,
  ]).join(':') + (origin ? `|${origin.longitude},${origin.latitude}` : '') + `|${JSON.stringify(routePoints)}`, [factories, origin, routePoints]);

  onSelectRef.current = onSelect;
  useEffect(() => { onStateChange?.(loadState); }, [loadState, onStateChange]);

  useEffect(() => {
    let cancelled = false;
    let loaded = false;
    let resizeObserver;
    const markers = [];
    const mapgl = maplibregl;
    setLoadState('loading');

    const map = new mapgl.Map({
      container: hostRef.current,
      style: {
        version: 8,
        sources: { base: { type: 'raster', tileSize: 256, maxzoom: 19,
          tiles: [accessToken
            ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}?access_token=${encodeURIComponent(accessToken)}`
            : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          attribution: accessToken
            ? '© <a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noopener noreferrer">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'
            : '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors' } },
        layers: [{ id: 'base', type: 'raster', source: 'base' }],
      },
      center: KOREA_CENTER,
      zoom: 5.8,
      minZoom: 5.3,
      maxZoom: 15,
      maxBounds: KOREA_BOUNDS,
      attributionControl: false,
      cooperativeGestures: true,
      antialias: true,
    });
    mapRef.current = map;
    markerRefs.current = new Map();
    map.addControl(new mapgl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new mapgl.AttributionControl({ compact: false }), 'bottom-left');
    if (onPickRef.current) {
      map.on('click', (event) => onPickRef.current?.({
        latitude: event.lngLat.lat, longitude: event.lngLat.lng,
      }));
      map.getCanvas().style.cursor = 'crosshair';
    }

    const handleError = (event) => {
      if (event?.error) console.error('Resource map error:', event.error);
      if (!cancelled && !loaded) setLoadState('error');
    };
    map.on('error', handleError);
    map.on('load', () => {
      if (cancelled) return;
      if (routePoints.length > 1) {
        map.addSource('actual-handoff-route', { type: 'geojson', data: {
          type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: routePoints },
        } });
        map.addLayer({ id: 'actual-handoff-route-outline', type: 'line', source: 'actual-handoff-route', paint: { 'line-color': '#fff', 'line-width': 8, 'line-opacity': .9 } });
        map.addLayer({ id: 'actual-handoff-route-line', type: 'line', source: 'actual-handoff-route', paint: { 'line-color': '#7754a6', 'line-width': 4, 'line-opacity': .95 } });
      }
      factories.forEach((factory) => {
        const element = createCompassMarker(factory, (id) => onSelectRef.current?.(id));
        const marker = new mapgl.Marker({ element, anchor: 'bottom', offset: [0, -3] })
          .setLngLat([factory.longitude, factory.latitude])
          .addTo(map);
        markers.push(marker);
        markerRefs.current.set(factory.id, { marker, element });
      });

      if (origin) {
        const marker = new mapgl.Marker({ element: createOriginMarker(origin), anchor: 'bottom', draggable: !!onPickRef.current })
          .setLngLat([origin.longitude, origin.latitude])
          .addTo(map);
        marker.on('dragend', () => {
          const point = marker.getLngLat();
          onPickRef.current?.({ latitude: point.lat, longitude: point.lng });
        });
        markers.push(marker);
      }

      if (factories.length) {
        const bounds = factories.reduce((nextBounds, factory) => nextBounds.extend([
          factory.longitude, factory.latitude,
        ]), new mapgl.LngLatBounds(
          [factories[0].longitude, factories[0].latitude],
          [factories[0].longitude, factories[0].latitude],
        ));
        if (origin) bounds.extend([origin.longitude, origin.latitude]);
        if (factories.length >= 5 && !origin) bounds.extend(DOKDO_COORDINATE);
        map.fitBounds(bounds, {
          padding: { top: 80, right: 80, bottom: 80, left: 80 },
          maxZoom: factories.length === 1 && !origin ? 11 : origin ? 10 : 7.8,
          duration: 700,
        });
      } else if (origin) {
        map.jumpTo({ center: [origin.longitude, origin.latitude], zoom: 10 });
      } else {
        map.fitBounds(KOREA_VIEW, { padding: 50, duration: 0 });
      }
      loaded = true;
      setLoadState('ready');
    });

    resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(hostRef.current);
    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      markers.forEach((marker) => marker.remove());
      map.off('error', handleError);
      map.remove();
      mapRef.current = null;
      markerRefs.current = new Map();
    };
  }, [accessToken, signature]);

  useEffect(() => {
    markerRefs.current.forEach(({ element }, id) => {
      element.classList.toggle('is-selected', id === selectedId);
    });
  }, [selectedId, loadState]);

  useEffect(() => {
    const focused = factories.find((factory) => factory.id === focusId);
    if (focused && mapRef.current?.loaded() && loadState === 'ready') {
      mapRef.current.flyTo({
        center: [focused.longitude, focused.latitude],
        zoom: Math.max(mapRef.current.getZoom(), 10),
        duration: 700,
        essential: true,
      });
    }
  }, [factories, focusId, loadState]);

  const stateMessage = {
    loading: '지도를 불러오는 중이에요.',
    'missing-token': 'Mapbox 공개 액세스 토큰을 설정해 주세요.',
    unsupported: '이 브라우저에서는 지도를 표시할 수 없어요.',
    error: '지도를 불러오지 못했어요. 아래 업체 목록을 이용해 주세요.',
  }[loadState];

  return <div className="resource-mapbox" data-load-state={loadState}>
    <div className="resource-mapbox-canvas" ref={hostRef}
      aria-label={label} />
    {loadState !== 'ready' && <div className="resource-map-state" role="status">
      <span />
      <p>{stateMessage}</p>
    </div>}
  </div>;
}
