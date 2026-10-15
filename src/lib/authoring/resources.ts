export const resourcePurposes = ['download', 'starter', 'example', 'slides', 'transcript', 'video', 'image'] as const
export type ResourcePurpose = typeof resourcePurposes[number]
export interface ResourceSelection { asset_id: string; purpose: ResourcePurpose }

/** Canonical order keeps saved snapshots and dirty-state comparisons consistent. */
export function resourceSelection(value: unknown): ResourceSelection[] {
  if (!Array.isArray(value) || value.length > 500) throw new Error('Invalid resource selection')
  const rows = value.map(row => {
    if (!row || typeof row !== 'object' || typeof row.asset_id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.asset_id) ||
      !resourcePurposes.includes(row.purpose) || Object.keys(row).some(key => !['asset_id', 'purpose'].includes(key))) {
      throw new Error('Invalid resource selection')
    }
    return { asset_id: row.asset_id.toLowerCase(), purpose: row.purpose as ResourcePurpose }
  })
  return [...new Map(rows.map(row => [`${row.asset_id}:${row.purpose}`, row])).values()]
    .sort((a, b) => a.asset_id.localeCompare(b.asset_id) || a.purpose.localeCompare(b.purpose))
}
