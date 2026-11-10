import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { DOKDO_COORDINATE, hideRoadNumberShields, styleKoreaMapContext } from '../../lib/mapbox-style.js';

const KOREA_CENTER = [128.25, 36.25];
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

export function ResourceMapbox({ factories, selectedId, focusId, onSelect }) {
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  const markerRefs = useRef(new Map());
  const onSelectRef = useRef(onSelect);
  const [loadState, setLoadState] = useState('loading');
  const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim();
  const signature = useMemo(() => factories.map((factory) => [
    factory.id, factory.longitude, factory.latitude,
  ]).join(':'), [factories]);

  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!accessToken) {
      setLoadState('missing-token');
      return undefined;
    }
    if (!mapboxgl.supported()) {
      setLoadState('unsupported');
      return undefined;
    }

    let cancelled = false;
    let loaded = false;
    let resizeObserver;
    const markers = [];
    mapboxgl.accessToken = accessToken;
    setLoadState('loading');

    const map = new mapboxgl.Map({
      container: hostRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
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
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left');

    const handleError = (event) => {
      if (event?.error) console.error('Resource map error:', event.error);
      if (!cancelled && !loaded) setLoadState('error');
    };
    map.on('error', handleError);
    map.on('load', () => {
      if (cancelled) return;
      hideRoadNumberShields(map);
      styleKoreaMapContext(map);
      factories.forEach((factory) => {
        const element = createCompassMarker(factory, (id) => onSelectRef.current?.(id));
        const marker = new mapboxgl.Marker({ element, anchor: 'bottom', offset: [0, -3] })
          .setLngLat([factory.longitude, factory.latitude])
          .addTo(map);
        markers.push(marker);
        markerRefs.current.set(factory.id, { marker, element });
      });

      if (factories.length) {
        const bounds = factories.reduce((nextBounds, factory) => nextBounds.extend([
          factory.longitude, factory.latitude,
        ]), new mapboxgl.LngLatBounds(
          [factories[0].longitude, factories[0].latitude],
          [factories[0].longitude, factories[0].latitude],
        ));
        if (factories.length >= 5) bounds.extend(DOKDO_COORDINATE);
        map.fitBounds(bounds, {
          padding: { top: 80, right: 80, bottom: 80, left: 80 },
          maxZoom: factories.length === 1 ? 11 : 7.8,
          duration: 700,
        });
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
    error: '지도를 불러오지 못했어요. 토큰과 네트워크를 확인해 주세요.',
  }[loadState];

  return <div className="resource-mapbox" data-load-state={loadState}>
    <div className="resource-mapbox-canvas" ref={hostRef}
      aria-label="전국 순환자원 처리업체 위치 지도" />
    {loadState !== 'ready' && <div className="resource-map-state" role="status">
      <span />
      <p>{stateMessage}</p>
    </div>}
  </div>;
}
