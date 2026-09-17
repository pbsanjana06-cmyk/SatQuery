import type { AIResult, AnalysisRecord, ReportRecord } from '../types'

const HISTORY_STORAGE_KEY = 'satquery.analysis-history'

const demoResults: Record<string, AIResult> = {
  default: {
    summary: 'Urban expansion is visible across the north-east sector, with new buildings, road extensions, and dense vegetation loss near the river corridor.',
    detailed_explanation:
      'The system compares the available imagery and highlights a moderate increase in impervious surfaces. Buildings appear more densely clustered in the upper-right quadrant, while a small vegetated neighborhood has been replaced by road infrastructure. The confidence remains moderate because the demonstration dataset is synthetic and does not include exact geospatial ground truth.',
    confidence_score: 91,
    reliability_score: 86,
    detected_objects: [
      { id: 'obj-1', object_type: 'building', label: 'Building cluster', confidence: 0.92, x: 18, y: 28, width: 24, height: 18 },
      { id: 'obj-2', object_type: 'road', label: 'Road extension', confidence: 0.89, x: 48, y: 36, width: 20, height: 12 },
      { id: 'obj-3', object_type: 'water_body', label: 'Waterbody', confidence: 0.94, x: 68, y: 58, width: 16, height: 14 },
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
      'Monitor the newly changed urban region over the next 30 days.',
      'Compare with higher-resolution imagery to validate building density.',
      'Verify construction activity near the river corridor with a second observation.',
    ],
    evidence_data: [
      'North-east urban expansion with new building geometry.',
      'Road network increased around the main access corridor.',
      'Vegetation reduction observed in the lower basin region.',
    ],
    reliability_level: 'HIGH',
  },
}

export const listAnalysisHistory = async (): Promise<AnalysisRecord[]> => {
  if (typeof window === 'undefined') return []

  try {
    const stored = window.localStorage.getItem(HISTORY_STORAGE_KEY)
    return stored ? JSON.parse(stored) as AnalysisRecord[] : []
  } catch {
    return []
  }
}

export const saveAnalysisResult = async (analysis: Partial<AnalysisRecord>): Promise<AnalysisRecord> => {
  const saved: AnalysisRecord = {
    id: analysis.id ?? crypto.randomUUID(),
    title: analysis.title ?? 'New analysis',
    type: analysis.type ?? 'single_image',
    query: analysis.query ?? 'Analyze this image',
    status: 'completed',
    created_at: new Date().toISOString(),
    confidence_score: analysis.confidence_score ?? 90,
    reliability_score: analysis.reliability_score ?? 85,
    summary: analysis.summary ?? 'Analysis complete.',
    images: analysis.images ?? [],
    result: analysis.result ?? demoResults.default,
  }

  if (typeof window !== 'undefined') {
    const history = await listAnalysisHistory()
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([saved, ...history.filter((item) => item.id !== saved.id)].slice(0, 50)))
  }

  return saved
}

export const listReports = async (): Promise<ReportRecord[]> => {
  return [
    { id: 'report-1', title: 'Urban Growth Report', created_at: '2026-09-12T14:30:00Z', analysis_id: 'analysis-1', file_name: 'urban-growth-report.pdf' },
    { id: 'report-2', title: 'Flood Assessment', created_at: '2026-09-11T11:20:00Z', analysis_id: 'analysis-2', file_name: 'flood-assessment.pdf' },
  ]
}
