const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'POST is required.' }, 405)

  try {
    const body = await request.json() as { latitude?: number; longitude?: number; aoiSource?: string }
    const latitude = Number(body.latitude)
    const longitude = Number(body.longitude)
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return jsonResponse({ error: 'Valid latitude and longitude are required.' }, 400)
    }

    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,wind_speed_10m,weather_code',
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,weather_code',
      forecast_days: '7',
      timezone: 'auto',
    })
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`)
    if (!response.ok) return jsonResponse({ message: 'Weather data is currently unavailable for this location.', source: 'Open-Meteo', risks: [] }, 502)
    const weather = await response.json() as { current?: Record<string, number>; daily?: Record<string, Array<number | string>> }
    const current = weather.current
    const daily = weather.daily
    const risks: Array<{ type: string; level: string; confidence: string; evidence: string[] }> = []
    const maximumRainProbability = Math.max(...(daily?.precipitation_probability_max ?? []).map(Number), 0)
    const maximumRainfall = Math.max(...(daily?.precipitation_sum ?? []).map(Number), 0)
    if (maximumRainProbability >= 70 && maximumRainfall >= 20) {
      risks.push({ type: 'Potential heavy rainfall conditions', level: maximumRainProbability >= 85 ? 'MODERATE' : 'LOW', confidence: 'Provider-derived, not a guaranteed prediction', evidence: [`Forecast precipitation probability up to ${maximumRainProbability}%`, `Forecast precipitation up to ${maximumRainfall} mm`] })
    }

    return jsonResponse({
      source: 'Open-Meteo forecast API',
      aoiSource: body.aoiSource ?? 'manual',
      current: current ? { temperature: current.temperature_2m, feelsLike: current.apparent_temperature, humidity: current.relative_humidity_2m, precipitation: current.precipitation, windSpeed: current.wind_speed_10m, weatherCode: current.weather_code } : undefined,
      daily: daily ? daily.time.map((date, index) => ({ date, max: daily.temperature_2m_max[index], min: daily.temperature_2m_min[index], precipitationProbability: daily.precipitation_probability_max[index], precipitation: daily.precipitation_sum[index], weatherCode: daily.weather_code[index] })) : [],
      risks,
      message: 'Weather and forecast values are from the configured provider. Historical climate, spectral indices, terrain, and official alerts require additional compatible data sources.',
    })
  } catch (error) {
    return jsonResponse({ message: error instanceof Error ? error.message : 'Weather data is currently unavailable for this location.', risks: [] }, 502)
  }
})
