/** 조회 실패, 공정 자료 없음, 업체 없음, 마지막 산출물을 서로 구분한다. */
export function routeOutcome({ status = 'ready', next, error } = {}) {
  if (error) return {
    kind: 'error', title: '처리 경로를 불러오지 못했어요',
    action: '잠시 뒤 다시 조회해 주세요. 조회 실패를 업체가 없다는 뜻으로 판단하지 않아요.',
  };
  const state = status === 'ready' ? next?.status : status;
  if (state === 'needs_input') return null;
  if (state === 'unsupported') return {
    kind: 'unsupported', title: '이 조건에 연결된 공정 자료를 확인해야 해요',
    action: '분류번호는 그대로 두고, 문진에 기록된 재질·형태가 실제 물량과 같은지 확인해 주세요. 맞다면 해당 조건의 공정 자료 보강이 필요해요.',
  };
  if (state === 'review_required') return {
    kind: 'review_required', title: '다음 업체를 찾기 전에 확인이 필요해요',
    action: '아래 확인 사항과 판정 기록을 먼저 확인해 주세요. 확인 전에는 다음 인계를 진행하지 않아요.',
  };
  if (state === 'end_of_route') return {
    kind: 'end_of_route', title: '등록된 공정의 마지막 산출 상태예요',
    action: '후보가 없다고 자동 완료되지는 않아요. 실제 산출물과 완료 증빙을 확인한 뒤 처리 건에서 완료를 기록해 주세요.',
  };
  if (state === 'no_route' || (state === 'candidates' && !hasFacilities(next))) return {
    kind: 'no_candidates', title: '현재 조건으로 연결된 업체가 아직 없어요',
    action: next?.options?.length
      ? '아래 공정 정보는 확인할 수 있어요. 실제 반입 형태와 처리능력이 확인된 업체 자료가 더 필요해요.'
      : '현재 형태와 맞는 공정·업체 근거가 더 필요해요. 형태는 실제 물량과 다를 때만 수정해 주세요.',
  };
  if (state === 'candidates') return null;
  return {
    kind: 'missing_result', title: '처리 경로 응답을 확인하지 못했어요',
    action: '다시 조회해 주세요. 같은 문제가 계속되면 이 문진 건의 경로 응답을 확인해야 해요.',
  };
}

export function hasFacilities(next) {
  return next?.options?.some((option) => option.facilities?.length > 0) || false;
}

export function validLocation(location) {
  return Boolean(location && Number.isFinite(location.latitude) && Number.isFinite(location.longitude) &&
    Math.abs(location.latitude) <= 90 && Math.abs(location.longitude) <= 180);
}

export function currentLotWarnings(warnings, reviewOrigin) {
  const current = warnings ?? [];
  if (!validLocation(reviewOrigin)) return current;
  return current.filter(warning => warning !== '사업장 좌표가 없어 거리 순위는 표시하지 않습니다.');
}

export function hasRoadDistance(site) {
  return site.road_distance_status === 'available' && Number.isFinite(site.road_distance_km) && site.road_distance_km > 0;
}

export function distanceBasis(options = []) {
  return options.some(o => o.facilities?.some(hasRoadDistance)) ? 'road' : 'straight_line';
}

export function comparisonDistance(site, basis) {
  const distance = basis === 'road' ? (hasRoadDistance(site) ? site.road_distance_km : null) : site.straight_line_distance_km;
  return Number.isFinite(distance) && distance >= 0 ? distance : Infinity;
}

export function distanceLabel(site) {
  if (hasRoadDistance(site)) return `도로 ${site.road_distance_km.toFixed(1)} km · ${site.road_distance_provider === 'osrm' ? 'OSRM 자동차 경로' : '카카오 자동차 경로'}`;
  return site.straight_line_distance_km != null
    ? `직선 ${site.straight_line_distance_km.toFixed(1)} km · 도로거리 미확인` : '거리 정보 없음';
}

/** Server ranks distinct sites; never truncate the set sent for AI review. */
export function nearbyOptions(options = [], origin) {
  const unbound = options.filter(o => !o.facilities?.length);
  if (!validLocation(origin)) return { primary: options.filter(o => o.facilities?.length), other: [], unbound, ranked: false };
  const sites = new Map();
  for (const option of options) for (const f of option.facilities || []) {
    if (Number.isInteger(f.distance_rank) && f.distance_rank >= 1 && f.distance_rank <= 5 && validLocation(f.location)) {
      sites.set(f.facility_key, f.distance_rank);
    }
  }
  const selected = new Set([...sites].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0])).slice(0, 5).map(([key]) => key));
  const subset = (included) => options.map(o => ({ ...o,
    facilities: (o.facilities || []).filter(f => selected.has(f.facility_key) === included),
  })).filter(o => o.facilities.length);
  return { primary: subset(true), other: subset(false), unbound, ranked: true };
}

/** 같은 업체가 여러 공정에 있어도 지도·업체 수에는 한 번만 센다. */
export function facilityMapData(options = []) {
  const sites = new Map();
  for (const option of options) {
    for (const site of option.facilities || []) {
      const previous = sites.get(site.facility_key);
      if (!previous || (!validLocation(previous.location) && validLocation(site.location))) {
        sites.set(site.facility_key, site);
      }
    }
  }
  return {
    total: sites.size,
    factories: [...sites.values()].filter((site) => validLocation(site.location)).map((site) => ({
      id: site.facility_key, name: site.label, location: site.region,
      latitude: site.location.latitude, longitude: site.location.longitude,
    })),
  };
}

/** Limit only map markers. All filtered candidates remain in cards and AI review. */
export function candidateMapOptions(options = [], origin, selectedKey, basis = distanceBasis(options)) {
  const sites = new Map();
  for (const option of options) for (const site of option.facilities || []) {
    if (validLocation(site.location) && !sites.has(site.facility_key)) {
      sites.set(site.facility_key, site);
    }
  }
  const ranked = validLocation(origin);
  const eligible = [...sites.values()].filter(site => !ranked ||
    Number.isFinite(comparisonDistance(site, basis)));
  if (ranked) eligible.sort((a, b) => comparisonDistance(a, basis) - comparisonDistance(b, basis) ||
    a.facility_key.localeCompare(b.facility_key));
  const shown = eligible.slice(0, 5);
  const selected = sites.get(selectedKey);
  if (selected && !shown.some(site => site.facility_key === selectedKey)) {
    if (shown.length === 5) shown.pop();
    shown.push(selected);
  }
  const keys = new Set(shown.map(site => site.facility_key));
  return options.map(option => ({ ...option,
    facilities: (option.facilities || []).filter(site => keys.has(site.facility_key)),
  })).filter(option => option.facilities.length);
}
