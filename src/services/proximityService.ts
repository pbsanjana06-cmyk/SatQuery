export type ProximityFeature = {
  id: string
  name: string
  type: string
  distanceMeters: number
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  detail: string
  category: 'hospital' | 'road' | 'building' | 'river' | 'forest' | 'agriculture' | 'industry' | 'hazard'
}

type OverpassElement = {
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

const classifyFeature = (type: string): ProximityFeature['category'] => {
  const normalized = type.toLowerCase()

  if (normalized.includes('hospital')) return 'hospital'
  if (normalized.includes('highway') || normalized.includes('road')) return 'road'
  if (normalized.includes('building')) return 'building'
  if (normalized.includes('water') || normalized.includes('river') || normalized.includes('lake')) return 'river'
  if (normalized.includes('forest')) return 'forest'
  if (normalized.includes('agricultural') || normalized.includes('farm') || normalized.includes('field')) return 'agriculture'
  if (normalized.includes('industrial') || normalized.includes('factory')) return 'industry'
  return 'hazard'
}

const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (value: number) => (value * Math.PI) / 180
  const earthRadius = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * earthRadius * Math.asin(Math.sqrt(a))
}

const extractName = (element: OverpassElement) => {
  const tags = element.tags ?? {}

  return (
    tags.name ||
    tags['operator'] ||
    tags['amenity'] ||
    tags['highway'] ||
    tags['landuse'] ||
    tags['natural'] ||
    'Unnamed nearby feature'
  )
}

const buildOverpassQuery = (lat: number, lng: number, radiusMeters: number) => `
  [out:json][timeout:25];
  (
    node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
    way["highway"](around:${radiusMeters},${lat},${lng});
    node["natural"="water"](around:${radiusMeters},${lat},${lng});
    way["landuse"="forest"](around:${radiusMeters},${lat},${lng});
    way["landuse"="industrial"](around:${radiusMeters},${lat},${lng});
    way["building"](around:${radiusMeters},${lat},${lng});
    way["landuse"="farmland"](around:${radiusMeters},${lat},${lng});
  );
  out center;
`

export async function fetchNearbyFeatures(lat: number, lng: number, radiusMeters: number): Promise<ProximityFeature[]> {
  const encodedQuery = encodeURIComponent(buildOverpassQuery(lat, lng, radiusMeters))
  const url = `https://overpass-api.de/api/interpreter?data=${encodedQuery}`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Unable to fetch nearby OpenStreetMap features.')
  }

  const data = await response.json() as { elements?: OverpassElement[] }
  const elements = data.elements ?? []

  const mapped = elements
    .map((element) => {
      const latitude = element.center?.lat ?? element.lat
      const longitude = element.center?.lon ?? element.lon
      if (latitude == null || longitude == null) return null

      const distanceMeters = getDistanceMeters(lat, lng, latitude, longitude)
      const rawType = element.tags?.amenity || element.tags?.highway || element.tags?.natural || element.tags?.landuse || element.tags?.building || 'feature'
      const name = extractName(element)
      const category = classifyFeature(rawType)

      return {
        id: `${category}-${element.id}`,
        name,
        type: rawType,
        distanceMeters: Math.round(distanceMeters),
        priority: distanceMeters < 500 ? 'HIGH' : distanceMeters < 1500 ? 'MEDIUM' : 'LOW',
        detail: `Nearby ${name} detected from OpenStreetMap data within ${Math.round(distanceMeters)} meters.`,
        category,
      } satisfies ProximityFeature
    })
    .filter((item): item is ProximityFeature => item !== null)

  return mapped
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 12)
}

export async function reverseGeocodeLocation(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`

  const response = await fetch(url, {
    headers: {
      'Accept-Language': 'en',
    },
  })

  if (!response.ok) {
    return 'Selected location'
  }

  const data = await response.json() as { display_name?: string }
  return data.display_name || 'Selected location'
}
