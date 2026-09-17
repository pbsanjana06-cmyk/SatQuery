const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ImageInput {
  name: string
  type: string
  dataUrl: string
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'POST is required.' }, 405)

  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiKey) return jsonResponse({ error: 'OPENAI_API_KEY is not configured in Supabase secrets.' }, 500)

  try {
    const body = await request.json() as { mode?: string; query?: string; images?: ImageInput[] }
    const query = body.query?.trim()
    const images = body.images ?? []

    if (!query) return jsonResponse({ error: 'A question is required.' }, 400)
    if (images.length === 0) return jsonResponse({ error: 'At least one image is required.' }, 400)

    const content = [
      {
        type: 'text',
        text: `Analyze the satellite imagery for the user question below. Analysis mode: ${body.mode ?? 'single'}. Return only valid JSON with these keys: summary (string), detailed_explanation (string), confidence_score (number 0-100), reliability_score (number 0-100), detected_objects (array of objects with id, object_type, label, confidence, x, y, width, height where coordinates are percentages), detected_changes (array of {label, percentage}), land_cover_result (array of {label, percentage, color}), area_measurements (object of numeric square-kilometer estimates), recommendations (array of strings), evidence_data (array of strings), reliability_level (HIGH, MEDIUM, or LOW). Be explicit when the imagery is insufficient for a conclusion. User question: ${query}`,
      },
      ...images.map((image) => ({
        type: 'image_url',
        image_url: { url: image.dataUrl, detail: 'low' },
      })),
    ]

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        temperature: 0.2,
        messages: [{ role: 'user', content }],
      }),
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      return jsonResponse({ error: `OpenAI request failed: ${errorText}` }, openaiResponse.status)
    }

    const result = await openaiResponse.json() as { choices?: Array<{ message?: { content?: string } }> }
    const resultContent = result.choices?.[0]?.message?.content
    if (!resultContent) return jsonResponse({ error: 'OpenAI returned an empty analysis.' }, 502)

    return jsonResponse(JSON.parse(resultContent))
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unable to analyze the imagery.' }, 500)
  }
})
