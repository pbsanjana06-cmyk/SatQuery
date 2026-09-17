import jsPDF from 'jspdf'

type ChartItem = { label: string; value: number; color?: string }

const chartColors = [
  [59, 130, 246],
  [16, 185, 129],
  [245, 158, 11],
  [239, 68, 68],
  [139, 92, 246],
  [20, 184, 166],
]

const hexToRgb = (color: string | undefined, fallback: number[]) => {
  if (!color?.startsWith('#') || color.length !== 7) return fallback
  return [1, 3, 5].map((index) => Number.parseInt(color.slice(index, index + 2), 16))
}

const drawPieChart = (pdf: jsPDF, items: ChartItem[], centerX: number, centerY: number, radius: number) => {
  const positiveItems = items.filter((item) => Number.isFinite(item.value) && item.value > 0)
  const total = positiveItems.reduce((sum, item) => sum + item.value, 0)
  if (!total) {
    pdf.setFontSize(10)
    pdf.setTextColor(100, 116, 139)
    pdf.text('No land-cover data available.', centerX - 30, centerY)
    return
  }

  let startAngle = -Math.PI / 2
  positiveItems.forEach((item, index) => {
    const endAngle = startAngle + (item.value / total) * Math.PI * 2
    const color = hexToRgb(item.color, chartColors[index % chartColors.length])
    pdf.setFillColor(color[0], color[1], color[2])
    const steps = Math.max(2, Math.ceil((endAngle - startAngle) * 18))
    for (let step = 0; step < steps; step += 1) {
      const firstAngle = startAngle + ((endAngle - startAngle) * step) / steps
      const secondAngle = startAngle + ((endAngle - startAngle) * (step + 1)) / steps
      pdf.triangle(
        centerX,
        centerY,
        centerX + Math.cos(firstAngle) * radius,
        centerY + Math.sin(firstAngle) * radius,
        centerX + Math.cos(secondAngle) * radius,
        centerY + Math.sin(secondAngle) * radius,
        'F',
      )
    }
    startAngle = endAngle
  })
}

const drawLegend = (pdf: jsPDF, items: ChartItem[], startX: number, startY: number, total: number) => {
  items.slice(0, 6).forEach((item, index) => {
    const color = hexToRgb(item.color, chartColors[index % chartColors.length])
    const y = startY + index * 9
    pdf.setFillColor(color[0], color[1], color[2])
    pdf.rect(startX, y - 4, 4, 4, 'F')
    pdf.setTextColor(51, 65, 85)
    pdf.setFontSize(9)
    pdf.text(`${item.label}: ${item.value.toFixed(1)}%`, startX + 7, y)
  })
  if (!items.length || total <= 0) {
    pdf.setTextColor(100, 116, 139)
    pdf.setFontSize(9)
    pdf.text('No data', startX, startY)
  }
}

const drawBarChart = (pdf: jsPDF, items: ChartItem[], startX: number, startY: number, width: number, height: number) => {
  const values = items.filter((item) => Number.isFinite(item.value))
  const maxValue = Math.max(...values.map((item) => Math.abs(item.value)), 1)
  pdf.setDrawColor(203, 213, 225)
  pdf.line(startX, startY + height, startX + width, startY + height)
  if (!values.length) {
    pdf.setFontSize(10)
    pdf.setTextColor(100, 116, 139)
    pdf.text('No change data available.', startX, startY + height / 2)
    return
  }

  const barWidth = Math.min(25, (width - 12) / values.length - 4)
  values.slice(0, 8).forEach((item, index) => {
    const barHeight = (Math.abs(item.value) / maxValue) * (height - 18)
    const x = startX + 8 + index * ((width - 8) / values.length)
    const y = item.value < 0 ? startY + height : startY + height - barHeight
    pdf.setFillColor(...chartColors[index % chartColors.length] as [number, number, number])
    pdf.rect(x, y, barWidth, item.value < 0 ? barHeight : barHeight, 'F')
    pdf.setTextColor(51, 65, 85)
    pdf.setFontSize(8)
    pdf.text(`${item.value > 0 ? '+' : ''}${item.value.toFixed(1)}%`, x, y - 3)
    const label = item.label.length > 16 ? `${item.label.slice(0, 15)}...` : item.label
    pdf.text(label, x, startY + height + 10, { angle: 0 })
  })
}

export const generateAnalysisPdf = async (payload: {
  title: string
  query: string
  summary: string
  explanation: string
  evidence: string[]
  recommendations: string[]
  confidence: number
  reliability: number
  landCover?: Array<{ label: string; percentage: number; color: string }>
  detectedChanges?: Array<{ label: string; percentage: number }>
  areaMeasurements?: Record<string, number>
}) => {
  const pdf = new jsPDF()

  pdf.setFillColor(15, 23, 42)
  pdf.rect(0, 0, 210, 30, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(20)
  pdf.text('SatQuery AI', 14, 18)

  pdf.setTextColor(15, 23, 42)
  pdf.setFontSize(16)
  pdf.text(payload.title, 14, 42)
  pdf.setFontSize(11)
  pdf.text(`Query: ${payload.query}`, 14, 54)
  pdf.text(`Confidence: ${payload.confidence}%`, 14, 66)
  pdf.text(`Reliability: ${payload.reliability}%`, 14, 74)

  pdf.setFontSize(13)
  pdf.text('Summary', 14, 90)
  pdf.setFontSize(10)
  const summaryLines = pdf.splitTextToSize(payload.summary, 180)
  pdf.text(summaryLines, 14, 100)

  pdf.setFontSize(13)
  pdf.text('Detailed Analysis', 14, 122)
  pdf.setFontSize(10)
  const explLines = pdf.splitTextToSize(payload.explanation, 180)
  pdf.text(explLines, 14, 132)

  pdf.setFontSize(13)
  pdf.text('Evidence', 14, 170)
  pdf.setFontSize(10)
  payload.evidence.forEach((item, index) => {
    pdf.text(`${index + 1}. ${item}`, 14, 180 + index * 8)
  })

  pdf.setFontSize(13)
  pdf.text('Recommendations', 14, 220)
  pdf.setFontSize(10)
  payload.recommendations.forEach((item, index) => {
    pdf.text(`${index + 1}. ${item}`, 14, 230 + index * 8)
  })

  pdf.addPage()
  pdf.setTextColor(15, 23, 42)
  pdf.setFontSize(16)
  pdf.text('Visual Summary & Statistics', 14, 20)

  const landCover = (payload.landCover ?? []).map((item) => ({ label: item.label, value: item.percentage, color: item.color }))
  const totalLandCover = landCover.reduce((sum, item) => sum + item.value, 0)
  pdf.setFontSize(13)
  pdf.text('Land-cover distribution', 14, 34)
  drawPieChart(pdf, landCover, 48, 76, 28)
  drawLegend(pdf, landCover, 88, 53, totalLandCover)

  pdf.setFontSize(13)
  pdf.text('Detected changes', 14, 125)
  drawBarChart(pdf, (payload.detectedChanges ?? []).map((item) => ({ label: item.label, value: item.percentage })), 18, 138, 174, 52)

  pdf.setFontSize(13)
  pdf.text('Statistics', 14, 210)
  const statistics = [
    ['Confidence score', `${payload.confidence}%`],
    ['Reliability score', `${payload.reliability}%`],
    ['Detected change categories', String(payload.detectedChanges?.length ?? 0)],
    ['Land-cover categories', String(payload.landCover?.length ?? 0)],
    ...Object.entries(payload.areaMeasurements ?? {}).map(([label, value]) => [label.replaceAll('_', ' '), `${value} km²`]),
  ]
  statistics.slice(0, 10).forEach(([label, value], index) => {
    const y = 220 + index * 8
    pdf.setFillColor(index % 2 === 0 ? 241 : 248, index % 2 === 0 ? 245 : 250, index % 2 === 0 ? 249 : 252)
    pdf.rect(14, y - 5, 182, 7, 'F')
    pdf.setTextColor(51, 65, 85)
    pdf.setFontSize(9)
    pdf.text(label, 18, y)
    pdf.text(value, 130, y)
  })

  return pdf.output('blob')
}
