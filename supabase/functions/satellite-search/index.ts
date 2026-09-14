const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function escapeOData(value: string) {
  return value.replace(/'/g, "''")
}

function areaPolygon(latitude: number, longitude: number, radiusMeters: number) {
  const latitudeDelta = radiusMeters / 111320
  const longitudeDelta = radiusMeters / (111320 * Math.max(0.2, Math.cos(latitude * Math.PI / 180)))
  const west = longitude - longitudeDelta
  const east = longitude + longitudeDelta
  const south = latitude - latitudeDelta
  const north = latitude + latitudeDelta
  return `POLYGON ((${west} ${south},${east} ${south},${east} ${north},${west} ${north},${west} ${south}))`
}

async function getAccessToken(clientId: string, clientSecret: string) {
  const response = await fetch('https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }),
  })
  if (!response.ok) throw new Error(`Copernicus authentication failed: ${await response.text()}`)
  const body = await response.json() as { access_token?: string }
  if (!body.access_token) throw new Error('Copernicus returned no access token.')
  return body.access_token
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'POST is required.' }, 405)

  const clientId = Deno.env.get('COPERNICUS_CLIENT_ID')
  const clientSecret = Deno.env.get('COPERNICUS_CLIENT_SECRET')
  if (!clientId || !clientSecret) return jsonResponse({ status: 'unconfigured', scenes: [], message: 'Configure COPERNICUS_CLIENT_ID and COPERNICUS_CLIENT_SECRET in Supabase secrets.' })

  try {
    const body = await request.json() as { latitude?: number; longitude?: number; radius?: number; from?: string; to?: string; cloudCover?: number }
    const latitude = Number(body.latitude)
    const longitude = Number(body.longitude)
    const radius = Number(body.radius ?? 2000)
    const from = body.from ?? new Date(Date.now() - 1000 * 60 * 60 * 24 * 365).toISOString()
    const to = body.to ?? new Date().toISOString()
    const cloudCover = Number(body.cloudCover ?? 30)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(radius)) return jsonResponse({ error: 'Valid latitude, longitude, and radius are required.' }, 400)

    const token = await getAccessToken(clientId, clientSecret)
    const area = areaPolygon(latitude, longitude, radius)
    const filter = `Collection/Name eq 'SENTINEL-2' and ContentDate/Start ge ${escapeOData(from)} and ContentDate/Start le ${escapeOData(to)} and OData.CSC.Intersects(area=geography'SRID=4326;${area}')`
    const query = new URLSearchParams({ '$filter': filter, '$orderby': 'ContentDate/Start desc', '$top': '20', '$expand': 'Attributes' })
    const response = await fetch(`https://catalogue.dataspace.copernicus.eu/odata/v1/Products?${query.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) throw new Error(`Copernicus catalogue request failed: ${await response.text()}`)
    const result = await response.json() as { value?: Array<Record<string, unknown>> }
    const scenes = (result.value ?? []).map((scene) => {
      const attributes = Array.isArray(scene.Attributes) ? scene.Attributes as Array<{ Name?: string; Value?: unknown }> : []
      const cloud = attributes.find((attribute) => attribute.Name?.toLowerCase().includes('cloud'))?.Value ?? null
      return {
        id: scene.Id,
        name: scene.Name,
        acquisition: (scene.ContentDate as { Start?: string } | undefined)?.Start ?? null,
        satellite: 'Sentinel-2',
        sensor: 'MSI',
        processing: 'Level-2A metadata depends on product name',
        resolution: '10 m primary bands',
        cloudCover: cloud,
        productUrl: scene.Id ? `https://catalogue.dataspace.copernicus.eu/odata/v1/Products(${scene.Id})` : null,
      }
    }).filter((scene) => scene.cloudCover === null || Number(scene.cloudCover) <= cloudCover)

    return jsonResponse({ status: 'ready', source: 'Copernicus Data Space', radius, scenes })
  } catch (error) {
    return jsonResponse({ status: 'error', scenes: [], error: error instanceof Error ? error.message : 'Satellite search failed.' }, 502)
  }
})
