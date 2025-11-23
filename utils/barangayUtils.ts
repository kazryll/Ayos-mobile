/**
 * Baguio City Barangay Boundary Utilities
 *
 * This module provides functions to determine which barangay a given coordinate belongs to
 * using point-in-polygon algorithms with actual barangay boundary data.
 */

export interface BarangayBoundary {
  name: string;
  longname: string;
  boundingBox: {
    type: "Polygon";
    coordinates: [number, number][]; // [longitude, latitude] pairs
  };
  coords: {
    type: "Point";
    coordinates: [number, number]; // Center point [longitude, latitude]
  };
}

/**
 * Point-in-Polygon algorithm using ray-casting
 * Determines if a point (lng, lat) is inside a polygon defined by coordinates
 *
 * @param point - [longitude, latitude] of the point to check
 * @param polygon - Array of [longitude, latitude] pairs defining the polygon
 * @returns true if point is inside polygon, false otherwise
 */
export function isPointInPolygon(
  point: [number, number],
  polygon: [number, number][]
): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Calculates the distance between two points using Haversine formula
 * Used as fallback when point is not within any polygon
 *
 * @param point1 - [longitude, latitude]
 * @param point2 - [longitude, latitude]
 * @returns distance in kilometers
 */
export function haversineDistance(
  point1: [number, number],
  point2: [number, number]
): number {
  const [lon1, lat1] = point1;
  const [lon2, lat2] = point2;

  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Finds which barangay a given coordinate belongs to
 * Uses a hybrid approach: polygon containment + distance verification
 *
 * @param longitude - Longitude of the point
 * @param latitude - Latitude of the point
 * @param boundaries - Array of barangay boundary data
 * @returns Barangay name or null if not found
 */
export function findBarangayByCoordinates(
  longitude: number,
  latitude: number,
  boundaries: BarangayBoundary[]
): string | null {
  const point: [number, number] = [longitude, latitude];
  const MAX_DISTANCE_THRESHOLD_KM = 1.5; // Maximum reasonable distance from barangay center

  // First pass: Check if point is inside any polygon AND verify distance to center
  const polygonMatches: Array<{ name: string; distance: number }> = [];

  for (const barangay of boundaries) {
    if (isPointInPolygon(point, barangay.boundingBox.coordinates)) {
      const distanceToCenter = haversineDistance(point, barangay.coords.coordinates);

      console.log(`📍 Point inside ${barangay.name} polygon (distance to center: ${distanceToCenter.toFixed(2)}km)`);

      polygonMatches.push({
        name: barangay.name,
        distance: distanceToCenter
      });
    }
  }

  // If we have polygon matches, return the one with closest center point
  if (polygonMatches.length > 0) {
    // Sort by distance to center (closest first)
    polygonMatches.sort((a, b) => a.distance - b.distance);

    const closest = polygonMatches[0];

    // If the closest match is within reasonable distance, use it
    if (closest.distance <= MAX_DISTANCE_THRESHOLD_KM) {
      console.log(`✅ Best match: ${closest.name} (${closest.distance.toFixed(2)}km from center)`);
      return closest.name;
    }

    // If distance is too far, it might be an inaccurate polygon
    console.log(`⚠️ Polygon match found but too far from center (${closest.distance.toFixed(2)}km), falling back to nearest coords...`);
  }

  // Second pass: Find nearest barangay by center point as fallback
  console.log('🔍 Finding nearest barangay by coords...');

  let nearestBarangay: string | null = null;
  let minDistance = Infinity;

  for (const barangay of boundaries) {
    const distance = haversineDistance(point, barangay.coords.coordinates);

    if (distance < minDistance) {
      minDistance = distance;
      nearestBarangay = barangay.name;
    }
  }

  if (nearestBarangay) {
    console.log(`✅ Nearest barangay: ${nearestBarangay} (${minDistance.toFixed(2)}km away)`);
    return nearestBarangay;
  }

  console.log('❌ No barangay found (should not happen if boundaries data is valid)');
  return null;
}

/**
 * Validates if coordinates are within Baguio City bounds
 * Baguio City approximate bounds: 16.35-16.45 lat, 120.55-120.65 lng
 */
export function isWithinBaguioCity(longitude: number, latitude: number): boolean {
  return (
    latitude >= 16.35 &&
    latitude <= 16.45 &&
    longitude >= 120.55 &&
    longitude <= 120.65
  );
}
