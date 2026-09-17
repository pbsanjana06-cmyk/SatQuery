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

  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  if (!geminiKey) return jsonResponse({ error: 'GEMINI_API_KEY is not configured in Supabase secrets.' }, 500)

  try {
    const body = await request.json() as { mode?: string; query?: string; images?: ImageInput[] }
    const query = body.query?.trim()
    const images = body.images ?? []

    if (!query) return jsonResponse({ error: 'A question is required.' }, 400)
    if (images.length === 0) return jsonResponse({ error: 'At least one image is required.' }, 400)

    const prompt = `Analyze the satellite imagery for the user question below. Analysis mode: ${body.mode ?? 'single'}. Return only valid JSON with these keys: summary (string), detailed_explanation (string), confidence_score (number 0-100), reliability_score (number 0-100), detected_objects (array of objects with id, object_type, label, confidence, x, y, width, height where coordinates are percentages), detected_changes (array of {label, percentage}), land_cover_result (array of {label, percentage, color}), area_measurements (object of numeric square-kilometer estimates), recommendations (array of strings), evidence_data (array of strings), reliability_level (HIGH, MEDIUM, or LOW). Be explicit when the imagery is insufficient for a conclusion. User question: ${query}`
    const parts = [
      { text: prompt },
      ...images.map((image) => {
        const match = image.dataUrl.match(/^data:([^;]+);base64,(.+)$/)
        return match
          ? { inlineData: { mimeType: match[1], data: match[2] } }
          : { text: `Image ${image.name} could not be prepared for inline analysis.` }
      }),
    ]

    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(geminiKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      return jsonResponse({ error: `Gemini request failed: ${errorText}` }, geminiResponse.status)
    }

    const result = await geminiResponse.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    const resultContent = result.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('')
    if (!resultContent) return jsonResponse({ error: 'Gemini returned an empty analysis.' }, 502)

    return jsonResponse(JSON.parse(resultContent))
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unable to analyze the imagery.' }, 500)
  }
})
