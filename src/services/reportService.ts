import jsPDF from 'jspdf'

export const generateAnalysisPdf = async (payload: {
  title: string
  query: string
  summary: string
  explanation: string
  evidence: string[]
  recommendations: string[]
  confidence: number
  reliability: number
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

  return pdf.output('blob')
}
