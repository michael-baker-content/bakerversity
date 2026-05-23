/**
 * courseSequence.ts
 *
 * Single source of truth for the canonical student-facing content order.
 *
 * The sequence is:
 *   1. Course-level intro pages (overview, introduction, syllabus, requirements)
 *      sorted by their own position.
 *   2. For each module (sorted by module.position):
 *        All lessons + assessments belonging to that module,
 *        interleaved and sorted by their own position column.
 *   3. Unassigned lessons (module_id = null), sorted by position.
 *   4. Course-level conclusion pages (everything not in INTRO_TYPES),
 *      sorted by their own position.
 *
 * This is the order used for prev/next navigation and sidebar rendering.
 * Every page that shows prev/next should call buildCourseSequence and
 * find its own index — never compute prev/next independently.
 */

export const INTRO_PAGE_TYPES = ['overview', 'introduction', 'syllabus', 'requirements'] as const

// ── Input shapes (minimal — only what sequence-building needs) ────────────────

export interface SeqLesson {
  id: string
  slug: string | null
  title: string
  position: number
  module_id: string | null
}

export interface SeqAssessment {
  id: string
  slug: string | null
  title: string
  assessment_type: 'quiz' | 'exam' | 'practice'
  position: number
  module_id: string | null
}

export interface SeqPage {
  id: string
  slug: string | null
  title: string
  page_type: string
  position: number
  module_id: string | null
}

export interface SeqModule {
  id: string
  title: string
  slug: string | null
  position: number
}

// ── Output shapes ─────────────────────────────────────────────────────────────

export type SequenceItemType = 'lesson' | 'assessment' | 'page'

export interface SequenceItem {
  type: SequenceItemType
  id: string
  slug: string | null
  title: string
  // Lesson-specific
  module_id?: string | null
  moduleSlug?: string | null
  // Assessment-specific
  assessment_type?: 'quiz' | 'exam' | 'practice'
  // Page-specific
  page_type?: string
}

// ── Main builder ──────────────────────────────────────────────────────────────

export function buildCourseSequence({
  modules,
  lessons,
  assessments,
  pages,
}: {
  modules: SeqModule[]
  lessons: SeqLesson[]
  assessments: SeqAssessment[]
  pages: SeqPage[]
}): SequenceItem[] {
  const sequence: SequenceItem[] = []

  // Build module slug lookup
  const moduleSlugMap = new Map<string, string>()
  for (const m of modules) {
    if (m.slug) moduleSlugMap.set(m.id, m.slug)
  }

  // 1. Course-level intro pages (no module_id, INTRO_TYPES)
  const introPages = pages
    .filter((p) => !p.module_id && (INTRO_PAGE_TYPES as readonly string[]).includes(p.page_type))
    .sort((a, b) => a.position - b.position)

  for (const p of introPages) {
    sequence.push({ type: 'page', id: p.id, slug: p.slug, title: p.title, page_type: p.page_type })
  }

  // 2. Module groups — sorted by module.position
  const sortedModules = [...modules].sort((a, b) => a.position - b.position)

  for (const mod of sortedModules) {
    const modLessons = lessons.filter((l) => l.module_id === mod.id)
    const modAssessments = assessments.filter((a) => a.module_id === mod.id)

    // Interleave by position within the module
    type ModItem =
      | { kind: 'lesson'; item: SeqLesson }
      | { kind: 'assessment'; item: SeqAssessment }

    const modItems: ModItem[] = [
      ...modLessons.map((l): ModItem => ({ kind: 'lesson', item: l })),
      ...modAssessments.map((a): ModItem => ({ kind: 'assessment', item: a })),
    ].sort((a, b) => a.item.position - b.item.position)

    for (const entry of modItems) {
      if (entry.kind === 'lesson') {
        const l = entry.item
        sequence.push({
          type: 'lesson',
          id: l.id,
          slug: l.slug,
          title: l.title,
          module_id: l.module_id,
          moduleSlug: mod.slug,
        })
      } else {
        const a = entry.item
        sequence.push({
          type: 'assessment',
          id: a.id,
          slug: a.slug,
          title: a.title,
          assessment_type: a.assessment_type,
          module_id: a.module_id,
          moduleSlug: mod.slug,
        })
      }
    }
  }

  // 3. Unassigned lessons (module_id = null), sorted by position
  const unassigned = lessons
    .filter((l) => !l.module_id)
    .sort((a, b) => a.position - b.position)

  for (const l of unassigned) {
    sequence.push({ type: 'lesson', id: l.id, slug: l.slug, title: l.title, module_id: null })
  }

  // 4. Course-level conclusion pages (no module_id, not INTRO_TYPES)
  const conclusionPages = pages
    .filter((p) => !p.module_id && !(INTRO_PAGE_TYPES as readonly string[]).includes(p.page_type))
    .sort((a, b) => a.position - b.position)

  for (const p of conclusionPages) {
    sequence.push({ type: 'page', id: p.id, slug: p.slug, title: p.title, page_type: p.page_type })
  }

  return sequence
}

// ── href builder — converts any SequenceItem to its URL ──────────────────────

export function sequenceItemHref(courseSlug: string, item: SequenceItem): string {
  if (item.type === 'lesson') {
    if (item.slug && item.moduleSlug) {
      return `/courses/${courseSlug}/${item.moduleSlug}/${item.slug}`
    }
    if (item.slug) {
      return `/courses/${courseSlug}/lessons/${item.slug}`
    }
    return `/courses/${courseSlug}/lessons/${item.id}`
  }

  if (item.type === 'assessment') {
    if (item.slug) {
      return `/courses/${courseSlug}/assessments/${item.slug}`
    }
    // Assessments without a slug can't be linked — caller should handle this
    return ''
  }

  // page
  if (item.slug) {
    return `/courses/${courseSlug}/pages/${item.slug}`
  }
  return `/courses/${courseSlug}/pages/${item.id}`
}
