export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatPercent(value?: number) {
  if (value === undefined) {
    return "Not scored";
  }

  return `${Math.round(value * 100)}%`;
}

export function formatCoordinates(lat: number, lng: number) {
  const latDirection = lat >= 0 ? "N" : "S";
  const lngDirection = lng >= 0 ? "E" : "W";

  return `${Math.abs(lat).toFixed(4)} ${latDirection}, ${Math.abs(lng).toFixed(4)} ${lngDirection}`;
}
