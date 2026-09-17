import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { UploadedImage } from '../../types'

export type AnalysisMode = 'single' | 'optical_sar' | 'before_after' | 'change_detection' | 'object_detection' | 'land_cover' | 'disaster' | 'agriculture' | 'urban_growth'

export interface MockAiPayload {
  summary: string
  detailed_explanation: string
  confidence_score: number
  reliability_score: number
  detected_objects: Array<{
    id: string
    object_type: string
    label: string
    confidence: number
    x: number
    y: number
    width: number
    height: number
  }>
  detected_changes: Array<{ label: string; percentage: number }>
  land_cover_result: Array<{ label: string; percentage: number; color: string }>
  area_measurements: Record<string, number>
  recommendations: string[]
  evidence_data: string[]
  reliability_level: 'HIGH' | 'MEDIUM' | 'LOW'
}

async function imageToDataUrl(image: UploadedImage): Promise<string> {
  if (image.url.startsWith('data:')) return image.url
  const response = await fetch(image.url)
  if (!response.ok) throw new Error(`Unable to read ${image.name}.`)
  const blob = await response.blob()
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error(`Unable to prepare ${image.name} for analysis.`))
    reader.readAsDataURL(blob)
  })
}

function extractJson(content: string): MockAiPayload {
  const jsonStart = content.indexOf('{')
  const jsonEnd = content.lastIndexOf('}')
  if (jsonStart < 0 || jsonEnd < jsonStart) throw new Error('The local vision model returned an unreadable response.')
  return JSON.parse(content.slice(jsonStart, jsonEnd + 1)) as MockAiPayload
}

const normalizeModelName = (name: string): string => {
  const trimmed = name.trim()
  if (!trimmed) return 'llama3.2-vision'
  return trimmed.includes(':') ? trimmed : `${trimmed}:latest`
}

const getOllamaModelName = (): string => normalizeModelName(import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2-vision')

async function ensureOllamaModelIsAvailable(): Promise<string> {
  const modelName = getOllamaModelName()

  const tagsResponse = await fetch('/ollama/api/tags')
  if (!tagsResponse.ok) {
    throw new Error('Ollama could not be reached. Start the Ollama server and verify that it is listening on port 11434.')
  }

  const tags = await tagsResponse.json() as { models?: Array<{ name?: string }> }
  const installedModels = new Set((tags.models ?? []).map((m) => normalizeModelName(m.name ?? '')).filter(Boolean))

  if (!installedModels.has(modelName)) {
    const baseName = modelName.replace(/:latest$/i, '')
    if (baseName === 'llama3.2' || baseName === 'llama3.2:latest') {
      throw new Error('This app needs a vision-capable Ollama model for image analysis. Install: ollama pull llama3.2-vision')
    }
    throw new Error(`Ollama model "${baseName}" is not installed. Run: ollama pull ${baseName}`)
  }

  return modelName
}

export const analyzeWithOllama = async (mode: AnalysisMode, prompt: string, images: UploadedImage[]): Promise<MockAiPayload> => {
  const modelName = await ensureOllamaModelIsAvailable()

  const response = await fetch('/ollama/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelName,
      stream: false,
      format: 'json',
      images: await Promise.all(images.map(async (image) => (await imageToDataUrl(image)).split(',')[1])),
      prompt: `Analyze these satellite images. Mode: ${mode}. Question: ${prompt}. Return only JSON with keys: summary, detailed_explanation, confidence_score (0-100), reliability_score (0-100), detected_objects (array with id, object_type, label, confidence, x, y, width, height), detected_changes (array of label and percentage), land_cover_result (array of label, percentage, color), area_measurements (object), recommendations (array), evidence_data (array), reliability_level (HIGH, MEDIUM, or LOW). If the image is insufficient, say so clearly.`,
    }),
  })

  if (!response.ok) {
    const fallbackMessage = `Ollama could not generate a response with model "${modelName}". Start the model with: ollama run ${modelName}`
    try {
      const body = await response.clone().json() as { error?: string }
      if (body.error) throw new Error(body.error)
    } catch {
      throw new Error(fallbackMessage)
    }
    throw new Error(fallbackMessage)
  }

  const result = await response.json() as { response?: string }
  if (!result.response) throw new Error('The local vision model returned no analysis.')
  return extractJson(result.response)
}

export const analyzeWithOpenAI = async (mode: AnalysisMode, prompt: string, images: UploadedImage[]): Promise<MockAiPayload> => {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured. Add the Supabase values to .env first.')

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Sign in before running an analysis.')

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mode,
      query: prompt,
      images: await Promise.all(images.map(async (image) => ({ name: image.name, type: image.type, dataUrl: await imageToDataUrl(image) }))),
    }),
  })

  const result = await response.json() as MockAiPayload & { error?: string }
  if (!response.ok) {
    const errorMessage = result.error || 'The analysis service returned an error.'
    const quotaExhausted = errorMessage.toLowerCase().includes('credit_balance_exhausted') || errorMessage.toLowerCase().includes('insufficient_quota') || errorMessage.toLowerCase().includes('no credits remaining')
    if (quotaExhausted) throw new Error('Live analysis is unavailable because the OpenAI API account has no credits remaining. Add billing credits, then try ANALYZE again.')
    throw new Error(errorMessage)
  }
  return result
}

export const mockAiAnalysis = async (mode: AnalysisMode, prompt: string): Promise<MockAiPayload> => {
  await new Promise((resolve) => setTimeout(resolve, 700))

  const question = prompt.toLowerCase()
  const questionSummary = question.includes('water') || question.includes('flood')
    ? 'Water-related signatures are visible in the analyzed imagery; compare with a dated reference image before treating this as flooding.'
    : question.includes('vegetation') || question.includes('agriculture') || question.includes('crop')
      ? 'Vegetation and agricultural patterns are visible; the imagery suggests a possible vegetation change that needs temporal verification.'
      : question.includes('building') || question.includes('urban') || question.includes('construction')
        ? 'Built-up structures and urban patterns are visible; the result highlights areas that may require a closer construction or expansion review.'
        : question.includes('road') || question.includes('bridge')
          ? 'Road and transport-like features are visible; review the highlighted corridor against a current reference image.'
          : `The imagery was analyzed for this question: "${prompt}". The result is decision support and should be verified with suitable reference data.`

  if (mode === 'disaster') {
    return {
      summary: questionSummary,
      detailed_explanation: 'The disaster workflow compares surface-water indicators, land-cover context, and change signals from the available imagery. Sentinel-1 SAR is useful under cloud cover, while Sentinel-2 supports visible vegetation and water interpretation. Treat this result as decision support, not an operational emergency assessment.',
      confidence_score: 89,
      reliability_score: 84,
      detected_objects: [
        { id: 'disaster-1', object_type: 'water_body', label: 'Possible floodwater', confidence: 0.89, x: 18, y: 30, width: 34, height: 24 },
        { id: 'disaster-2', object_type: 'road', label: 'Potentially affected road', confidence: 0.81, x: 55, y: 52, width: 22, height: 14 },
      ],
      detected_changes: [
        { label: 'Affected surface', percentage: 27.4 },
        { label: 'Water increase', percentage: 18.6 },
        { label: 'Vegetation impact', percentage: -11.2 },
      ],
      land_cover_result: [
        { label: 'Affected water', percentage: 27.4, color: '#38bdf8' },
        { label: 'Agriculture', percentage: 31.2, color: '#22c55e' },
        { label: 'Urban', percentage: 19.5, color: '#60a5fa' },
        { label: 'Forest', percentage: 21.9, color: '#16a34a' },
      ],
      area_measurements: { affected_area: 14.2, water_area: 8.1, agricultural_area: 12.4 },
      recommendations: [
        'Verify affected zones with current high-resolution imagery.',
        'Prioritize road and settlement areas near expanded water signatures.',
        'Compare a second acquisition before issuing an operational alert.',
      ],
      evidence_data: [
        'Expanded water-like signatures are visible in the comparison region.',
        'SAR backscatter change may indicate standing water or surface disruption.',
        'Agricultural and road areas overlap the detected affected footprint.',
      ],
      reliability_level: 'MEDIUM',
    }
  }

  return {
    summary: questionSummary,
    detailed_explanation:
      `The ${mode} analysis highlights expanding impervious surfaces and a moderate reduction in vegetation around the northern corridor. Confirm important findings with current imagery and local ground truth before taking action.`,
    confidence_score: 91,
    reliability_score: 86,
    detected_objects: [
      { id: 'demo-1', object_type: 'building', label: 'New building cluster', confidence: 0.92, x: 20, y: 18, width: 28, height: 20 },
      { id: 'demo-2', object_type: 'road', label: 'Road extension', confidence: 0.89, x: 52, y: 42, width: 26, height: 18 },
      { id: 'demo-3', object_type: 'water_body', label: 'Water body', confidence: 0.94, x: 68, y: 58, width: 16, height: 12 },
    ],
    detected_changes: [
      { label: 'Urban Area', percentage: 12.8 },
      { label: 'Vegetation', percentage: -8.3 },
      { label: 'Water Area', percentage: 4.1 },
    ],
    land_cover_result: [
      { label: 'Agriculture', percentage: 38.4, color: '#22c55e' },
      { label: 'Forest', percentage: 24.2, color: '#16a34a' },
      { label: 'Urban', percentage: 18.7, color: '#60a5fa' },
      { label: 'Water', percentage: 9.3, color: '#38bdf8' },
      { label: 'Bare Land', percentage: 6.1, color: '#f59e0b' },
      { label: 'Roads', percentage: 3.3, color: '#c084fc' },
    ],
    area_measurements: {
      agricultural_area: 12.7,
      water_area: 3.4,
      urban_area: 8.9,
    },
    recommendations: [
      'Validate with a second image to confirm expansion density.',
      'Review the road extension against local infrastructure plans.',
      'Monitor vegetation loss in the river-adjacent zone.',
    ],
    evidence_data: [
      'The northwest cluster shows a denser concentration of structures.',
      'The central transport corridor increased in linear continuity.',
      'Vegetation loss is most pronounced near the river basin.',
    ],
    reliability_level: 'HIGH',
  }
}
