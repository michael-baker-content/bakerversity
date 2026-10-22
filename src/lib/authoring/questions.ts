import { textImageError } from '../textImage.mjs'
/** Keep the chosen answer attached to its option when rows are removed or compacted. */
export function removeAnswerOption(options: string[], correct: string, index: number) {
  const selected = correct === '' ? -1 : Number(correct)
  return { options: options.filter((_, i) => i !== index), correct_answer: selected === index ? '' : selected > index ? String(selected - 1) : correct }
}
export function compactAnswerOptions(options: string[], correct: string) {
  const selected = correct === '' ? -1 : Number(correct)
  const kept = options.map((text, index) => ({ text: text.trim(), index })).filter(row => row.text)
  const answer = kept.findIndex(row => row.index === selected)
  if (kept.length < 2) throw new Error('Enter at least two answer choices.')
  if (answer < 0) throw new Error('Select a non-empty answer choice as correct.')
  return { options: kept.map(row => row.text), correct_answer: String(answer) }
}
export function hasQuestionContent(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const node = value as { type?: string; text?: string; content?: unknown[]; attrs?: Record<string, unknown> }
  if (node.type === 'directoryTree') return typeof node.attrs?.source === 'string' && !!node.attrs.source.trim()
  if (node.type === 'text') return !!node.text?.trim()
  if (['image','inlineMath','blockMath','mafsGraph','terminal'].includes(node.type ?? '')) return true
  return Array.isArray(node.content) && node.content.some(hasQuestionContent)
}
export function normaliseQuestion(value: Record<string, unknown>) {
  const componentError=textImageError(value.content)||textImageError(value.explanation_content)
  if(componentError)throw new Error(componentError)
  const type = value.question_type
  if (!['multiple_choice','true_false','short_answer','text_response'].includes(String(type))) throw new Error('Choose a supported question type.')
  if (!hasQuestionContent(value.content) && !(typeof value.question_text === 'string' && value.question_text.trim())) throw new Error('Enter a question before saving.')
  const base = { question_type: type as 'multiple_choice'|'true_false'|'short_answer'|'text_response', content: value.content ?? null, question_text: typeof value.question_text === 'string' ? value.question_text.trim() : null, explanation: typeof value.explanation === 'string' ? value.explanation.trim() : null, explanation_content: value.explanation_content ?? null, options: null as string[] | null, correct_answer: null as string | null, accepted_answers: null as string[] | null }
  if (type === 'multiple_choice') {
    if (!Array.isArray(value.options) || !value.options.every(x => typeof x === 'string')) throw new Error('Answer choices must be text.')
    Object.assign(base, compactAnswerOptions(value.options, String(value.correct_answer ?? '')))
  } else if (type === 'true_false') {
    if (!['true','false'].includes(String(value.correct_answer))) throw new Error('Choose True or False as the correct answer.')
    base.options = ['true','false']; base.correct_answer = String(value.correct_answer)
  } else if (type === 'short_answer') {
    if (!Array.isArray(value.accepted_answers) || !value.accepted_answers.every(x => typeof x === 'string')) throw new Error('Enter accepted answers as text.')
    base.accepted_answers = [...new Set(value.accepted_answers.map(x => x.trim().toLowerCase()).filter(Boolean))]
    if (!base.accepted_answers.length) throw new Error('Enter at least one accepted answer.')
  }
  return base
}
