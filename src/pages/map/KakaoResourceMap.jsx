import { useEffect, useRef, useState } from 'react';

let sdk;
function loadSdk(key) {
  if (window.kakao?.maps?.Map) return Promise.resolve(window.kakao.maps);
  if (!sdk) sdk = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = setTimeout(() => reject(new Error('지도 응답 시간 초과')), 15000);
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`;
    script.async = true;
    script.onload = () => {
      if (!window.kakao?.maps) { clearTimeout(timer); reject(new Error('지도 SDK 접근 실패')); return; }
      window.kakao.maps.load(() => { clearTimeout(timer); resolve(window.kakao.maps); });
    };
    script.onerror = () => { clearTimeout(timer); reject(new Error('지도 SDK 로드 실패')); };
    document.head.appendChild(script);
  }).catch(error => { sdk = null; throw error; });
  return sdk;
}

export function KakaoResourceMap({ factories = [], selectedId, focusId, onSelect, origin = null,
  routePoints = [], routeLines = [], onPick, label = '사업장 위치 지도', onStateChange }) {
  const host = useRef(null);
  const mapRef = useRef(null);
  const markerRefs = useRef(new Map());
  const callbacks = useRef({ onSelect, onPick });
  callbacks.current = { onSelect, onPick };
  const [state, setState] = useState('loading');
  const key = import.meta.env.VITE_KAKAO_MAP_APP_KEY?.trim();
  const signature = JSON.stringify([factories.map(f => [f.id, f.latitude, f.longitude, f.name]), origin, routePoints, routeLines]);
  useEffect(() => { onStateChange?.(state); }, [state, onStateChange]);
  useEffect(() => {
    let cancelled = false;
    let resize;
    const overlays = [];
    const listeners = [];
    markerRefs.current = new Map();
    setState('loading');
    loadSdk(key).then(maps => {
      if (cancelled) return;
      const position = p => new maps.LatLng(p.latitude, p.longitude);
      const map = new maps.Map(host.current, { center: origin ? position(origin) : new maps.LatLng(36.3, 127.6),
        level: origin ? (onPick ? 3 : 7) : 13 });
      mapRef.current = map;
      map.addControl(new maps.ZoomControl(), maps.ControlPosition.RIGHT);
      const bounds = new maps.LatLngBounds();
      let points = 0;
      const extend = p => { bounds.extend(p); points++; };
      for (const factory of factories) {
        const element = document.createElement('button');
        element.type = 'button';
        element.className = 'resource-compass-marker';
        element.setAttribute('aria-label', `${factory.name}, ${factory.location || ''}`);
        const image = document.createElement('img');
        image.src = '/images/scrap-compass-2d-purple.png'; image.alt = '';
        const name = document.createElement('strong'); name.textContent = factory.name;
        element.append(image, name);
        element.onclick = () => callbacks.current.onSelect?.(factory.id);
        element.classList.toggle('is-selected', factory.id === selectedId);
        const p = position(factory);
        const overlay = new maps.CustomOverlay({ map, position: p, content: element, yAnchor: 1 });
        overlays.push(overlay); markerRefs.current.set(factory.id, element); extend(p);
      }
      if (origin) {
        const p = position(origin);
        const element = document.createElement('div'); element.className = 'resource-origin-marker';
        const dot = document.createElement('span');
        const name = document.createElement('strong'); name.textContent = origin.label || '우리 사업장';
        element.append(dot, name);
        const overlay = new maps.CustomOverlay({ map, position: p, content: element, yAnchor: 1 });
        overlays.push(overlay); extend(p);
        if (callbacks.current.onPick) {
          const marker = new maps.Marker({ map, position: p, draggable: true });
          overlays.push(marker);
          const drag = () => { const point = marker.getPosition(); overlay.setPosition(point);
            callbacks.current.onPick?.({ latitude: point.getLat(), longitude: point.getLng() }); };
          maps.event.addListener(marker, 'dragend', drag); listeners.push([marker, 'dragend', drag]);
        }
      }
      for (const coordinates of [...routeLines, ...(routePoints.length > 1 ? [routePoints] : [])]) {
        if (coordinates.length < 2) continue;
        const path = coordinates.map(([lon, lat]) => new maps.LatLng(lat, lon));
        overlays.push(new maps.Polyline({ map, path, strokeWeight: 8, strokeColor: '#ffffff', strokeOpacity: .95 }));
        overlays.push(new maps.Polyline({ map, path, strokeWeight: 5, strokeColor: '#7754a6', strokeOpacity: 1 }));
        path.forEach(extend);
      }
      if (points > 1) map.setBounds(bounds, 65, 65, 65, 65);
      if (callbacks.current.onPick) {
        const pick = event => callbacks.current.onPick?.({ latitude: event.latLng.getLat(), longitude: event.latLng.getLng() });
        maps.event.addListener(map, 'click', pick); listeners.push([map, 'click', pick]);
      }
      resize = new ResizeObserver(() => { if (!cancelled) { const center = map.getCenter(); map.relayout(); map.setCenter(center); } });
      resize.observe(host.current);
      setState('ready');
    }).catch(() => { if (!cancelled) setState('error'); });
    return () => {
      cancelled = true; resize?.disconnect();
      const maps = window.kakao?.maps;
      listeners.forEach(([target, event, handler]) => maps?.event.removeListener(target, event, handler));
      overlays.forEach(overlay => overlay.setMap(null));
      if (host.current) host.current.replaceChildren();
      mapRef.current = null;
    };
  }, [key, signature]);
  useEffect(() => { markerRefs.current.forEach((element, id) => element.classList.toggle('is-selected', id === selectedId)); }, [selectedId, state]);
  useEffect(() => {
    const site = factories.find(f => f.id === focusId);
    if (site && mapRef.current && state === 'ready') {
      mapRef.current.setLevel(5);
      mapRef.current.panTo(new window.kakao.maps.LatLng(site.latitude, site.longitude));
    }
  }, [focusId, state]);
  return <div className="resource-mapbox" data-provider="kakao" data-load-state={state}>
    <div className="resource-mapbox-canvas" ref={host} aria-label={label} />
    {state !== 'ready' && <div className="resource-map-state" role="status"><span /><p>{state === 'error'
      ? '카카오 지도를 불러오지 못했어요. 앱의 카카오맵 사용 설정과 허용 도메인을 확인해 주세요.' : '카카오 지도를 불러오는 중이에요.'}</p></div>}
  </div>;
}
