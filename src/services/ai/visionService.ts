export const analyzeQuestionForImage = async (query: string) => ({
  query,
  intent: 'object_detection',
  summary: 'Query routed through the vision-language analysis pipeline.',
})
