export const INTRO_PAGE_TYPES = ['overview', 'introduction', 'syllabus', 'requirements'] as const
type Placement = 'introduction' | 'body' | 'conclusion'
interface BaseItem { id: string; slug: string | null; title: string; position: number; module_id: string | null; placement?: Placement; is_required?: boolean; estimated_minutes?: number | null }
export interface SeqLesson extends BaseItem {}
export interface SeqAssessment extends BaseItem { assessment_type: 'quiz' | 'exam' | 'practice' }
export interface SeqPage extends BaseItem { page_type: string }
export interface SeqModule { id: string; title: string; slug: string | null; position: number }
export type SequenceItemType = 'lesson' | 'assessment' | 'page'
export interface SequenceItem extends Omit<BaseItem, 'position' | 'module_id'> { type: SequenceItemType; module_id?: string | null; moduleSlug?: string | null; assessment_type?: 'quiz' | 'exam' | 'practice'; page_type?: string }
export function buildCourseSequence({ modules, lessons, assessments, pages }: { modules: SeqModule[]; lessons: SeqLesson[]; assessments: SeqAssessment[]; pages: SeqPage[] }): SequenceItem[] {
  const all = [...lessons.map(x => ({ ...x, type: 'lesson' as const })), ...assessments.map(x => ({ ...x, type: 'assessment' as const })), ...pages.map(x => ({ ...x, type: 'page' as const }))]
  const placement = (x: typeof all[number]): Placement => x.placement ?? (x.type === 'page' ? ((INTRO_PAGE_TYPES as readonly string[]).includes(x.page_type) ? 'introduction' : 'conclusion') : 'body')
  const sort = (items: typeof all) => items.sort((a,b) => a.position-b.position || a.id.localeCompare(b.id))
  const sequence: SequenceItem[] = []
  const addUnassigned = (where: Placement) => sequence.push(...sort(all.filter(x => !x.module_id && placement(x) === where)))
  addUnassigned('introduction')
  for (const module of [...modules].sort((a,b) => a.position-b.position || a.id.localeCompare(b.id))) sequence.push(...sort(all.filter(x => x.module_id === module.id)).map(x => ({ ...x, moduleSlug: module.slug })))
  addUnassigned('body'); addUnassigned('conclusion')
  return sequence
}
export function sequenceItemHref(courseSlug: string, item: SequenceItem): string {
  const base = `/courses/${courseSlug}`
  if (item.type === 'lesson') return item.moduleSlug && item.slug ? `${base}/${item.moduleSlug}/${item.slug}` : `${base}/lessons/${item.slug ?? item.id}`
  if (item.type === 'assessment') return item.slug ? `${base}/assessments/${item.slug}` : ''
  return `${base}/pages/${item.slug ?? item.id}`
}
