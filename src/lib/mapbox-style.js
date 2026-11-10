export function hideRoadNumberShields(map) {
  const shieldLayerPattern = /(?:road|route|motorway|highway).*(?:shield|number)|(?:shield|number).*(?:road|route)/i;
  map.getStyle()?.layers?.forEach((layer) => {
    if (shieldLayerPattern.test(layer.id)) {
      map.setLayoutProperty(layer.id, 'visibility', 'none');
    }
  });
}

export const DOKDO_COORDINATE = [131.8693, 37.2411];

export function styleKoreaMapContext(map) {
  if (!map.getSource('scrap-country-boundaries')) {
    map.addSource('scrap-country-boundaries', {
      type: 'vector',
      url: 'mapbox://mapbox.country-boundaries-v1',
    });
  }
  const firstRoadLayer = map.getStyle()?.layers?.find((layer) =>
    layer.type === 'line' && /road|bridge|tunnel/i.test(layer.id))?.id;
  if (!map.getLayer('scrap-other-countries')) {
    map.addLayer({
      id: 'scrap-other-countries',
      type: 'fill',
      source: 'scrap-country-boundaries',
      'source-layer': 'country_boundaries',
      filter: [
        'all',
        ['==', ['get', 'disputed'], 'false'],
        [
          'any',
          ['==', ['get', 'worldview'], 'all'],
          ['in', 'US', ['get', 'worldview']],
        ],
        ['!=', ['get', 'iso_3166_1'], 'KR'],
      ],
      paint: {
        'fill-color': '#fffdf9',
        'fill-opacity': 0.82,
      },
    }, firstRoadLayer);
  }

  if (!map.getSource('scrap-dokdo')) {
    map.addSource('scrap-dokdo', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: { name: 'Dokdo' },
        geometry: { type: 'Point', coordinates: DOKDO_COORDINATE },
      },
    });
  }
  if (!map.getLayer('scrap-dokdo-point')) {
    map.addLayer({
      id: 'scrap-dokdo-point',
      type: 'circle',
      source: 'scrap-dokdo',
      paint: {
        'circle-radius': 3,
        'circle-color': '#7654b7',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.5,
      },
    });
  }
  if (!map.getLayer('scrap-dokdo-label')) {
    map.addLayer({
      id: 'scrap-dokdo-label',
      type: 'symbol',
      source: 'scrap-dokdo',
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 10,
        'text-offset': [0.7, 0],
        'text-anchor': 'left',
      },
      paint: {
        'text-color': '#433b48',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5,
      },
    });
  }
}
