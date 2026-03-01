export interface GeoLocation {
  city: string
  region: string
  country: string
}

let cachedGeo: GeoLocation | null | undefined = undefined

export async function getCachedGeoLocation(): Promise<GeoLocation | null> {
  if (cachedGeo !== undefined) return cachedGeo
  try {
    const res = await fetch('https://ipapi.co/json/')
    if (!res.ok) { cachedGeo = null; return null }
    const data = await res.json()
    cachedGeo = {
      city: data.city ?? '',
      region: data.region ?? '',
      country: data.country_name ?? '',
    }
    return cachedGeo
  } catch {
    cachedGeo = null
    return null
  }
}
