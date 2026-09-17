const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function validRadius(radius: unknown): radius is number {
  return [500, 1000, 2000, 5000, 10000].includes(Number(radius))
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (request.method === 'POST') {
    try {
      const body = await request.json() as { latitude?: number; longitude?: number; radius?: number }
      const latitude = Number(body.latitude)
      const longitude = Number(body.longitude)
      const radius = Number(body.radius)
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        return jsonResponse({ error: 'Valid latitude and longitude are required.' }, 400)
      }
      if (!validRadius(radius)) return jsonResponse({ error: 'Radius must be 500, 1000, 2000, 5000, or 10000 meters.' }, 400)

      const providerConfigured = Boolean(Deno.env.get('SATELLITE_PROVIDER_URL'))
      return jsonResponse({
        analysis_id: crypto.randomUUID(),
        location: { latitude, longitude },
        radius,
        issues: [],
        confidence: null,
        execution_trace: [
          'Location permission',
          'Area selected',
          'Satellite data availability checked',
          providerConfigured ? 'Satellite provider available; provider adapter required' : 'No satellite provider configured',
        ],
        status: providerConfigured ? 'queued' : 'unavailable',
        message: providerConfigured
          ? 'Satellite provider is configured, but analysis requires its approved adapter.'
          : 'No suitable satellite imagery is currently available for this analysis.',
      })
    } catch {
      return jsonResponse({ error: 'Invalid JSON request.' }, 400)
    }
  }

  if (request.method === 'GET') {
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const analysisId = url.searchParams.get('analysis_id') || pathParts.at(-1)
    if (!analysisId) return jsonResponse({ error: 'analysis_id is required.' }, 400)
    if (pathParts.includes('issues')) return jsonResponse({ analysis_id: analysisId, issues: [], message: 'Issue retrieval requires the Supabase database adapter.' })
    return jsonResponse({ analysis_id: analysisId, issues: [], execution_trace: [], message: 'Analysis retrieval requires the Supabase database adapter.' })
  }

  return jsonResponse({ error: 'GET or POST is required.' }, 405)
})
