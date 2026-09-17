import { isSupabaseConfigured, supabase } from '../lib/supabase'

interface LocationEvent {
  lat: number
  lng: number
  accuracy?: number
}

export async function saveLocationEvent(location: LocationEvent): Promise<void> {
  if (!isSupabaseConfigured) return

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('location_events').insert({
      user_id: user.id,
      latitude: location.lat,
      longitude: location.lng,
      accuracy_meters: location.accuracy ?? null,
    })
  } catch {
    // Location persistence is optional; the map should continue working offline.
  }
}