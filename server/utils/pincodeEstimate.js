// Rough India-pincode → distance/delivery-time estimator.
// No external API or courier call: uses the known Indian postal-circle regions
// (first digit = zone, first 2 digits = sub-region) to place a pincode at an
// approximate centroid, then straight-line (haversine) distance from there.
// This is intentionally approximate — good enough for a "X-Y business days"
// estimate on the product page, not for real courier routing.

// Approx centroid [lat, lng] for each 2-digit postal prefix (falls back to the
// 1-digit zone centroid when a specific prefix isn't listed).
const PREFIX_CENTROIDS = {
  // 1x — Delhi, Haryana, Punjab, HP, J&K, Chandigarh
  11: [28.63, 77.21], // Delhi
  12: [28.98, 76.6], // Haryana (north)
  13: [29.9, 76.6], // Haryana/Punjab border
  14: [30.9, 75.85], // Punjab
  15: [31.5, 74.9], // Punjab (Amritsar)
  16: [30.74, 76.78], // Chandigarh/Punjab
  17: [31.7, 76.9], // Himachal Pradesh
  18: [33.0, 75.3], // J&K (Jammu)
  19: [34.08, 74.8], // J&K (Srinagar)
  // 2x — UP, Uttarakhand, Rajasthan (partial)
  20: [27.9, 78.0], // West UP (Agra)
  21: [26.85, 80.9], // Central UP
  22: [26.85, 80.95], // Lucknow region
  23: [26.75, 83.37], // East UP
  24: [25.45, 81.85], // Allahabad region
  25: [29.4, 79.5], // Uttarakhand
  26: [30.32, 78.03], // Dehradun
  27: [25.6, 85.1], // Bihar border
  28: [26.45, 80.35], // Kanpur region
  30: [26.9, 75.8], // Rajasthan (Jaipur)
  31: [26.25, 73.02], // Jodhpur
  32: [24.58, 73.68], // Udaipur
  33: [25.2, 75.87], // Kota
  34: [27.6, 76.6], // Alwar/Bharatpur
  // 3x/4x — Gujarat, Maharashtra, MP, Chhattisgarh, Goa
  36: [22.3, 70.8], // Gujarat (Rajkot/Saurashtra)
  37: [23.02, 72.57], // Ahmedabad
  38: [21.17, 72.83], // Surat
  39: [22.71, 75.86], // MP (Indore)
  40: [19.08, 72.88], // Mumbai
  41: [18.52, 73.85], // Pune
  42: [21.15, 79.09], // Nagpur
  43: [20.0, 73.78], // Nashik
  44: [21.25, 81.63], // Chhattisgarh (Raipur)
  45: [23.26, 77.4], // MP (Bhopal)
  46: [23.18, 79.95], // MP (Jabalpur)
  48: [22.3, 73.2], // Vadodara
  49: [15.5, 73.83], // Goa
  // 5x — Andhra Pradesh, Telangana, Karnataka
  50: [17.38, 78.48], // Hyderabad
  51: [16.5, 80.6], // AP (Vijayawada)
  52: [17.68, 83.2], // AP (Visakhapatnam)
  53: [13.35, 79.42], // Rayalaseema
  56: [12.97, 77.59], // Bengaluru
  57: [12.3, 76.65], // Mysuru
  58: [15.85, 74.5], // Belagavi
  59: [16.85, 74.5], // Karnataka (Kolhapur border)
  // 6x — Tamil Nadu, Kerala, Puducherry
  60: [13.08, 80.27], // Chennai
  61: [11.02, 76.97], // Coimbatore
  62: [9.93, 78.12], // Madurai
  63: [10.79, 78.7], // Trichy
  64: [11.66, 78.15], // Salem
  67: [9.93, 76.26], // Ernakulam/Kochi
  68: [8.52, 76.94], // Thiruvananthapuram
  69: [11.25, 75.78], // Kozhikode
  // 7x — West Bengal, Odisha, NE states
  70: [22.57, 88.36], // Kolkata
  71: [23.68, 86.99], // WB (Asansol/Durgapur)
  73: [25.57, 91.88], // Meghalaya (Shillong)
  74: [26.14, 91.73], // Assam (Guwahati)
  75: [20.27, 85.83], // Bhubaneswar
  76: [19.82, 85.09], // Odisha (Berhampur)
  78: [26.14, 91.73], // Assam
  79: [24.83, 93.94], // Manipur (Imphal)
  // 8x — Bihar, Jharkhand
  80: [25.6, 85.13], // Patna
  81: [23.36, 85.33], // Jharkhand (Ranchi)
  82: [25.75, 85.0], // North Bihar
  84: [25.35, 87.02], // Bihar (Bhagalpur)
  85: [26.13, 85.4], // Bihar (Darbhanga)
};

// 1-digit zone fallback (used when the 2-digit prefix has no specific entry above)
const ZONE_CENTROIDS = {
  1: [30.0, 76.5],
  2: [26.5, 80.0],
  3: [24.0, 73.5],
  4: [20.0, 76.0],
  5: [15.5, 78.5],
  6: [11.0, 78.0],
  7: [23.5, 88.0],
  8: [25.5, 85.5],
  9: [28.6, 77.2], // Army Postal Service — treat as Delhi
};

export function pincodeCentroid(pincode) {
  const digits = String(pincode || "").replace(/\D/g, "");
  if (digits.length < 6) return null;
  const prefix2 = parseInt(digits.slice(0, 2), 10);
  const zone = parseInt(digits[0], 10);
  return PREFIX_CENTROIDS[prefix2] || ZONE_CENTROIDS[zone] || null;
}

function haversineKm([lat1, lng1], [lat2, lng2]) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Straight-line distance in km between two Indian pincodes, or null if either
 * pincode isn't recognised. Approximate — see file header.
 */
export function pincodeDistanceKm(pincodeA, pincodeB) {
  const a = pincodeCentroid(pincodeA);
  const b = pincodeCentroid(pincodeB);
  if (!a || !b) return null;
  return Math.round(haversineKm(a, b));
}

// Distance band (km) -> business days added on top of the base processing time
const DISTANCE_BANDS = [
  { maxKm: 50, days: [0, 1] },
  { maxKm: 250, days: [1, 2] },
  { maxKm: 600, days: [2, 4] },
  { maxKm: 1200, days: [3, 6] },
  { maxKm: 2000, days: [4, 8] },
  { maxKm: Infinity, days: [5, 10] },
];

export function transitDaysForDistance(km) {
  if (km == null) return DISTANCE_BANDS[DISTANCE_BANDS.length - 1].days;
  const band = DISTANCE_BANDS.find((b) => km <= b.maxKm);
  return band.days;
}

/**
 * Estimate delivery for a destination pincode against a list of ship-from locations
 * (each needs a `pincode`/`postalCode`). Picks the nearest one; falls back to a
 * generic same-zone-unknown estimate if the destination pincode isn't recognised.
 */
export function estimateDelivery(destinationPincode, origins, { processingMinDays = 0, processingMaxDays = 0 } = {}) {
  const destDigits = String(destinationPincode || "").replace(/\D/g, "");
  if (destDigits.length !== 6) {
    return { ok: false, reason: "Enter a valid 6-digit pincode" };
  }

  const candidates = origins
    .map((o) => ({ ...o, distanceKm: pincodeDistanceKm(destDigits, o.pincode) }))
    .filter((o) => o.distanceKm != null)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const nearest = candidates[0] || null;
  const [transitMin, transitMax] = transitDaysForDistance(nearest?.distanceKm ?? null);

  return {
    ok: true,
    destinationPincode: destDigits,
    nearestWarehouse: nearest ? { id: nearest.id, label: nearest.label, city: nearest.city, distanceKm: nearest.distanceKm } : null,
    minDays: processingMinDays + transitMin,
    maxDays: processingMaxDays + transitMax,
    approximate: true,
  };
}
