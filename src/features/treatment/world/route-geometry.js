export function routeSegmentPairs(count) {
  return Array.from({ length: count }, (_, index) => [index, index + 1]);
}

export function isActiveFacility(index, { planned, activeStopIndex, activeSegmentIndex }) {
  return (planned && index === 0)
    || (activeStopIndex >= 0 && index === activeStopIndex + 1)
    || (activeSegmentIndex >= 0 && index === activeSegmentIndex + 1);
}
