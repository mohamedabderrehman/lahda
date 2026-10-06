/**
 * Delivery zone: محافظة بابل / الحلة (Babylon/Hilla, Iraq).
 * Uses a polygon that approximates the governorate boundary.
 */

// Polygon vertices (lat, lng) tracing the approximate boundary of Babylon Governorate
const BABYLON_POLYGON: [number, number][] = [
  [32.95, 43.90],  // NW corner
  [33.00, 44.05],  // N
  [33.05, 44.20],  // NE approach
  [33.02, 44.40],  // NE
  [32.95, 44.55],  // E of Hilla
  [32.85, 44.65],  // SE approach
  [32.70, 44.70],  // SE
  [32.55, 44.65],  // S
  [32.40, 44.55],  // SW approach
  [32.25, 44.50],  // SW
  [32.15, 44.40],  // SSW
  [32.10, 44.25],  // S center
  [32.15, 44.10],  // SW inner
  [32.25, 43.95],  // W approach
  [32.40, 43.85],  // W
  [32.55, 43.80],  // WNW
  [32.70, 43.82],  // NW approach
  [32.85, 43.85],  // NW
];

export const DELIVERY_ZONE_REJECTION_MSG =
  'التوصيل غير متوفر في الوقت الحالي لعنوانك';

function isPointInPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    if (
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

export function isInsideDeliveryZone(
  lat: number | null | undefined,
  lng: number | null | undefined,
): boolean {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false;
  }
  return isPointInPolygon(lat, lng, BABYLON_POLYGON);
}
