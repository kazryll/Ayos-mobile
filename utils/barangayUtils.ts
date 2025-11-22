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

  // First pass: Check if point is inside any barangay polygon
  for (const barangay of boundaries) {
    if (isPointInPolygon(point, barangay.boundingBox.coordinates)) {
      console.log(`✅ Point is inside ${barangay.name}`);
      return barangay.name;
    }
  }

  // Second pass: Find nearest barangay center as fallback
  console.log('⚠️ Point not inside any polygon, finding nearest barangay...');
  
  let nearestBarangay: string | null = null;
  let minDistance = Infinity;

  for (const barangay of boundaries) {
    const distance = haversineDistance(point, barangay.coords.coordinates);
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestBarangay = barangay.name;
    }
  }

  if (nearestBarangay && minDistance < 2) { // Within 2km
    console.log(`✅ Nearest barangay: ${nearestBarangay} (${minDistance.toFixed(2)}km away)`);
    return nearestBarangay;
  }

  console.log('❌ No nearby barangay found');
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
