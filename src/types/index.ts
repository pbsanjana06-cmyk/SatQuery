export type ImageMode = 'single' | 'optical_sar' | 'before_after' | 'change_detection'

export type AnalysisStatus = 'queued' | 'processing' | 'completed' | 'failed'

export type ImageType = 'optical' | 'sar' | 'before' | 'after' | 'multispectral'

export interface UserProfile {
  id: string
  full_name: string
  email: string
  avatar_url?: string
  organization?: string
}

export interface UploadedImage {
  id: string
  name: string
  url: string
  type: ImageType
  size: number
  width?: number
  height?: number
}

export interface AnalysisStep {
  id: string
  step_name: string
  status: 'done' | 'active' | 'pending'
  description: string
  duration_ms: number
}

export interface DetectedObject {
  id: string
  object_type: string
  label: string
  confidence: number
  x: number
  y: number
  width: number
  height: number
  area?: number
  metadata?: Record<string, unknown>
}

export interface LandCoverItem {
  label: string
  percentage: number
  color: string
}

export interface AIResult {
  summary: string
  detailed_explanation: string
  confidence_score: number
  reliability_score: number
  detected_objects: DetectedObject[]
  detected_changes: { label: string; percentage: number }[]
  land_cover_result: LandCoverItem[]
  area_measurements: Record<string, number>
  recommendations: string[]
  evidence_data: string[]
  reliability_level: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface AnalysisRecord {
  id: string
  title: string
  type: ImageMode | 'single_image' | 'change_detection' | 'optical_sar' | 'object_detection' | 'land_cover' | 'disaster' | 'agriculture' | 'urban_growth'
  query: string
  status: AnalysisStatus
  created_at: string
  confidence_score: number
  reliability_score: number
  summary: string
  images: UploadedImage[]
  result?: AIResult
}

export interface ReportRecord {
  id: string
  title: string
  created_at: string
  analysis_id: string
  file_name: string
}

export type NearbyIssueCategory = 'environmental' | 'infrastructure' | 'urban' | 'agriculture' | 'disaster'
export type NearbyIssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH'

export interface NearbyIssue {
  id: string
  issue_type: string
  category: NearbyIssueCategory
  severity: NearbyIssueSeverity
  latitude: number
  longitude: number
  distance_meters: number
  area: number | null
  description: string
  confidence: number | null
  reliability: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNAVAILABLE'
  evidence: string[]
  detected_at: string
  reference_date?: string
}

export interface NearbyIssueAnalysis {
  id: string
  latitude: number
  longitude: number
  radius: number
  status: AnalysisStatus
  mode: 'demo' | 'uploaded-imagery' | 'unavailable'
  created_at: string
  completed_at?: string
  issues: NearbyIssue[]
  message?: string
  execution_trace: string[]
}
