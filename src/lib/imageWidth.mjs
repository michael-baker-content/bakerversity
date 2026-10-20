/** Pixel limit for one placement; independent of the source image dimensions. */
/** @param {unknown} value @returns {number | null} */
export function imageMaxWidth(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'number' && typeof value !== 'string') return null
  const n=Number(value)
  return Number.isInteger(n) && n >= 1 && n <= 10000 ? n : null
}
