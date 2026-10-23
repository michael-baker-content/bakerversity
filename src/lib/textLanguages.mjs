// Shared by authoring and reader HTML; normalize legacy English/Polish values.
export const textLanguages = [
  { code: 'en-US', label: 'English (en_us)' },
  { code: 'pl-PL', label: 'Polish (pl_pl)' },
  { code: 'de-DE', label: 'German (de_de)' },
  { code: 'es-ES', label: 'Spanish (es_es)' },
  { code: 'fr-FR', label: 'French (fr_fr)' },
  { code: 'cs-CZ', label: 'Czech (cs_cz)' },
  { code: 'ja-JP', label: 'Japanese (ja-JP)' },
]

/** @param {unknown} value @returns {string | null} */
export function normalizeTextLanguage(value) {
  if (typeof value !== 'string') return null
  const normalized = value.replace(/_/g, '-').toLowerCase()
  if (normalized === 'en') return 'en-US'
  if (normalized === 'pl') return 'pl-PL'
  return textLanguages.find(({code}) => code.toLowerCase() === normalized)?.code ?? null
}
