'use client'
import { recoveryOptions } from '@/lib/authoring/recovery'
import EditorDownload from '@/components/EditorDownload'
import MarkdownImport from '@/components/MarkdownImport'
import {importedLearningSettings} from '@/lib/authoring/importMetadata'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import ItemMetadataFields, { itemMetadata, type ItemMetadata } from '@/components/ItemMetadataFields'
import AssetLibrary from '@/components/AssetLibrary'
import { resourceSelection, type ResourceSelection } from '@/lib/authoring/resources'
import { compactAnswerOptions, removeAnswerOption, hasQuestionContent } from '@/lib/authoring/questions'
import { useUnsavedChanges, discardMessage } from '@/lib/authoring/useUnsavedChanges'
import { requestJson, AuthoringRequestError } from '@/lib/authoring/request'
import { useDraft } from '@/lib/authoring/useDraft'
import DraftStatus from '@/components/DraftStatus'
import RevisionHistory from '@/components/RevisionHistory'
import dynamic from 'next/dynamic'
import type { AssessmentType } from '@/lib/types'
import { LatexInput } from '@/components/editor/NodeViews'

const TipTapEditor = dynamic(() => import('@/components/TipTapEditor'), { ssr: false })
const LatexModal = dynamic(() => import('@/components/LatexModal'), { ssr: false })

// ── Types ─────────────────────────────────────────────────────────────────────

type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'text_response'

interface Question {
  id: string
  question_type: QuestionType
  content: Record<string, unknown> | null
  question_text: string | null
  options: string[] | null
  correct_answer: string | null
  accepted_answers: string[] | null
  explanation: string | null
  explanation_content: Record<string, unknown> | null
  position: number
}

interface AssessmentData extends Partial<ItemMetadata> {
  version: number
  resources?: ResourceSelection[]
  id: string
  title: string
  slug: string | null
  assessment_type: AssessmentType
  is_graded: boolean
  passing_score: number
  is_published: boolean
  module_id: string | null
  intro_content: Record<string, unknown> | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Multiple choice',
  true_false: 'True / false',
  short_answer: 'Short answer',
  text_response: 'Text response',
}

const TYPE_COLORS: Record<QuestionType, { bg: string; color: string }> = {
  multiple_choice: { bg: 'var(--indigo-muted)',  color: 'var(--indigo)' },
  true_false:      { bg: 'var(--amber-muted)',   color: 'var(--amber-ink)' },
  short_answer:    { bg: 'var(--surface-2)',      color: 'var(--text-2)' },
  text_response:   { bg: 'var(--surface-2)',      color: 'var(--text-3)' },
}

function emptyDoc(): Record<string, unknown> {
  return { type: 'doc', content: [{ type: 'paragraph' }] }
}

function docIsEmpty(doc: Record<string, unknown> | null): boolean { return !hasQuestionContent(doc) }

// ── QuestionForm ──────────────────────────────────────────────────────────────

interface QuestionFormState {
  question_type: QuestionType
  content: Record<string, unknown>
  options: string[]
  correct_answer: string
  accepted_answers: string[]
  explanation_content: Record<string, unknown>
}

function emptyForm(): QuestionFormState {
  return {
    question_type: 'multiple_choice',
    content: emptyDoc(),
    options: ['', '', '', ''],
    correct_answer: '0',
    accepted_answers: [''],
    explanation_content: emptyDoc(),
  }
}

function QuestionForm({
  initial,
  courseId,
  onSave,
  onCancel,
  saving,
  editorPacks,
}: {
  initial: QuestionFormState
  courseId: string
  onSave: (data: QuestionFormState) => Promise<void>
  onCancel: () => void
  saving: boolean
  editorPacks: string[]
}) {
  const [recoveryKey,setRecoveryKey]=useState(0)
  const [form, setForm] = useState<QuestionFormState>(initial)
  useUnsavedChanges(saving || JSON.stringify(form) !== JSON.stringify(initial))
  const [showLatexModal, setShowLatexModal] = useState(false)
  const [latexTarget, setLatexTarget] = useState<'question' | 'explanation'>('question')
  const insertLatexQuestionRef = useRef<((latex: string, display: boolean) => void) | null>(null)
  const insertLatexExplanationRef = useRef<((latex: string, display: boolean) => void) | null>(null)

  const set = <K extends keyof QuestionFormState>(key: K, val: QuestionFormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }))

  const handleTypeChange = (t: QuestionType) => {
    setForm((f) => ({
      ...f,
      question_type: t,
      options: t === 'multiple_choice' ? (f.options.length >= 2 ? f.options : ['', '', '', '']) : [],
      correct_answer: t === 'true_false' ? 'true' : t === 'multiple_choice' ? '0' : '',
      accepted_answers: t === 'short_answer' ? (f.accepted_answers.length ? f.accepted_answers : ['']) : [],
    }))
  }

  const setOption = (i: number, val: string) => {
    const next = [...form.options]
    next[i] = val
    set('options', next)
  }

  const addOption = () => set('options', [...form.options, ''])
  const removeOption = (i: number) => {
    setForm(f => ({...f, ...removeAnswerOption(f.options, f.correct_answer, i)}))
  }

  const setAccepted = (i: number, val: string) => {
    const next = [...form.accepted_answers]
    next[i] = val
    set('accepted_answers', next)
  }
  const addAccepted = () => set('accepted_answers', [...form.accepted_answers, ''])
  const removeAccepted = (i: number) =>
    set('accepted_answers', form.accepted_answers.filter((_, idx) => idx !== i))

  const canSave = !docIsEmpty(form.content) && (
    form.question_type === 'multiple_choice' ? form.options.filter(o => o.trim()).length >= 2 && form.correct_answer !== '' && !!form.options[Number(form.correct_answer)]?.trim() : form.question_type !== 'short_answer' || form.accepted_answers.some(a => a.trim())
  )

  const recovery=recoveryOptions('question',form,v=>{setForm(current=>({...current,...v}));setRecoveryKey(k=>k+1)},courseId,saving)
  const hasMath = editorPacks.includes('math')

  return (
    <>
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}><MarkdownImport recovery={recovery} recoveryOnly /><EditorDownload recovery={recovery} /></div>
      {showLatexModal && hasMath && (
        <LatexModal
          onInsert={(latex, displayMode) => {
            if (latexTarget === 'question') insertLatexQuestionRef.current?.(latex, displayMode)
            else insertLatexExplanationRef.current?.(latex, displayMode)
            setShowLatexModal(false)
          }}
          onClose={() => setShowLatexModal(false)}
          showDisplayToggle
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Question type */}
        <div>
          <label style={labelStyle}>Question type</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className={`btn btn-sm ${form.question_type === t ? 'btn-secondary' : 'btn-ghost'}`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          {form.question_type === 'text_response' && (
            <p style={hintStyle}>Free-response questions are reviewed in the Responses tab and do not count toward the automatic score.</p>
          )}
          {form.question_type === 'short_answer' && (
            <p style={hintStyle}>Auto-graded. Student input is trimmed and lowercased before comparison.</p>
          )}
        </div>

        {/* Question body — TipTap */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label style={labelStyle}>Question</label>
            {hasMath && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => { setLatexTarget('question'); setShowLatexModal(true) }}
              >
                ∑ Math
              </button>
            )}
          </div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
            <TipTapEditor courseId={courseId ?? undefined}
              key={`q-body-${initial.question_type}-${recoveryKey}`}
              packs={hasMath ? ['math'] : []}
              content={docIsEmpty(form.content) ? undefined : form.content}
              onChange={(doc) => set('content', doc)}
              onLatexButtonClick={() => { setLatexTarget('question'); setShowLatexModal(true) }}
              onInsertLatex={(fn) => { insertLatexQuestionRef.current = fn }}
            />
          </div>
        </div>

        {/* Multiple choice options — LatexInput for each option */}
        {form.question_type === 'multiple_choice' && (
          <div>
            <label style={labelStyle}>
              Answer choices
              {hasMath && <span style={optStyle}> ($x^2$ for inline math)</span>}
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {form.options.map((opt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <input
                    type="radio"
                    name="correct_answer"
                    checked={form.correct_answer === String(i)}
                    onChange={() => set('correct_answer', String(i))}
                    title="Mark as correct"
                    aria-label={`Mark option ${String.fromCharCode(65 + i)} as correct`}
                    style={{ accentColor: 'var(--indigo)', flexShrink: 0, marginTop: 9 }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--text-3)', minWidth: 18, paddingTop: 8 }}>
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <div style={{ flex: 1 }}>
                    <LatexInput
                      value={opt}
                      onChange={(val) => setOption(i, val)}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    />
                  </div>
                  {form.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 16, padding: '0 4px', lineHeight: 1, marginTop: 6, flexShrink: 0 }}
                      title="Remove option"
                    >×</button>
                  )}
                </div>
              ))}
              {form.options.length < 6 && (
                <button
                  type="button"
                  onClick={addOption}
                  className="btn btn-ghost btn-sm"
                  style={{ alignSelf: 'flex-start', marginTop: 2 }}
                >
                  + Add option
                </button>
              )}
            </div>
            <p style={hintStyle}>Select the radio button next to the correct answer.</p>
          </div>
        )}

        {/* True / false */}
        {form.question_type === 'true_false' && (
          <div>
            <label style={labelStyle}>Correct answer</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['true', 'false'].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => set('correct_answer', val)}
                  className={`btn btn-sm ${form.correct_answer === val ? 'btn-secondary' : 'btn-ghost'}`}
                >
                  {val.charAt(0).toUpperCase() + val.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Short answer — accepted answers with LatexInput */}
        {form.question_type === 'short_answer' && (
          <div>
            <label style={labelStyle}>
              Accepted answers
              {hasMath && <span style={optStyle}> ($x^2$ for inline math)</span>}
            </label>
            <p style={{ ...hintStyle, marginBottom: 8 }}>
              All values are compared case-insensitively after trimming. Add multiple entries for alternative phrasings (e.g. "4", "four", "4.0").
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {form.accepted_answers.map((ans, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <LatexInput
                      value={ans}
                      onChange={(val) => setAccepted(i, val)}
                      placeholder={i === 0 ? 'e.g. 4' : 'Alternative answer…'}
                    />
                  </div>
                  {form.accepted_answers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAccepted(i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 16, padding: '0 4px', lineHeight: 1, marginTop: 6, flexShrink: 0 }}
                    >×</button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addAccepted}
                className="btn btn-ghost btn-sm"
                style={{ alignSelf: 'flex-start', marginTop: 2 }}
              >
                + Add alternative
              </button>
            </div>
          </div>
        )}

        {/* Explanation — TipTap (not shown for text_response) */}
        {form.question_type !== 'text_response' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                Explanation <span style={optStyle}>(shown to student after answering)</span>
              </label>
              {hasMath && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setLatexTarget('explanation'); setShowLatexModal(true) }}
                >
                  ∑ Math
                </button>
              )}
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <TipTapEditor courseId={courseId ?? undefined}
                key={`q-explanation-${initial.question_type}-${recoveryKey}`}
                packs={hasMath ? ['math'] : []}
                content={docIsEmpty(form.explanation_content) ? undefined : form.explanation_content}
                onChange={(doc) => set('explanation_content', doc)}
                onLatexButtonClick={() => { setLatexTarget('explanation'); setShowLatexModal(true) }}
                onInsertLatex={(fn) => { insertLatexExplanationRef.current = fn }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            disabled={saving || !canSave}
            onClick={() => onSave(form)}
            className="btn btn-primary btn-sm"
          >
            {saving ? 'Saving…' : 'Save question'}
          </button>
          <button type="button" onClick={() => { if (JSON.stringify(form) === JSON.stringify(initial) || confirm(discardMessage)) onCancel() }} className="btn btn-ghost btn-sm">
            Cancel
          </button>
        </div>
      </div>
    </>
  )
}

// ── QuestionRow ───────────────────────────────────────────────────────────────

function QuestionRow({
  question,
  index,
  courseId,
  assessmentId,
  editorPacks,
  onUpdated,
  onDeleted,
  onEditingChange,
}: {
  question: Question
  index: number
  courseId: string
  assessmentId: string
  editorPacks: string[]
  onEditingChange: (id:string,open:boolean) => void
  onUpdated: () => Promise<void>
  onDeleted: () => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  useEffect(()=>{onEditingChange(question.id,editing);return ()=>onEditingChange(question.id,false)},[editing,question.id,onEditingChange])
  const [saving, setSaving] = useState(false)
  const [questionError, setQuestionError] = useState('')
  const [uncertain, setUncertain] = useState(false)
  const { bg, color } = TYPE_COLORS[question.question_type]

  const handleSave = async (form: QuestionFormState) => {
    if(saving || uncertain) return
    setQuestionError('');setSaving(true)
    const payload: Record<string, unknown> = {
      question_type: form.question_type,
      content: docIsEmpty(form.content) ? null : form.content,
      explanation_content: docIsEmpty(form.explanation_content) ? null : form.explanation_content,
    }

    if (form.question_type === 'multiple_choice') {
      Object.assign(payload, compactAnswerOptions(form.options, form.correct_answer))
    } else if (form.question_type === 'true_false') {
      payload.options = ['true', 'false']
      payload.correct_answer = form.correct_answer
    } else if (form.question_type === 'short_answer') {
      payload.accepted_answers = form.accepted_answers.filter((a) => a.trim())
    }

    try {
      await requestJson(`/api/admin/courses/${courseId}/assessments/${assessmentId}/questions/${question.id}`, {method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}, 'question save')
      setEditing(false)
      try { await onUpdated() } catch { setQuestionError('Question saved, but the list could not refresh. Reload before making more changes.'); setUncertain(true) }
    } catch(error) {setQuestionError(error instanceof Error ? error.message : 'Unable to save question.');setUncertain(error instanceof AuthoringRequestError && (error.uncertain || error.status===409))}
    finally {setSaving(false)}
  }

  const handleDelete = async () => {
    if (saving || uncertain || !confirm('Delete this question? This cannot be undone.')) return
    setSaving(true);setQuestionError('')
    try {
      await requestJson(`/api/admin/courses/${courseId}/assessments/${assessmentId}/questions/${question.id}`, {method:'DELETE'}, 'question deletion')
      try { await onDeleted() } catch { setQuestionError('Question deleted, but the list could not refresh. Reload to see the current list.');setUncertain(true) }
    } catch(error) {setQuestionError(error instanceof Error ? error.message : 'Unable to delete question.');setUncertain(error instanceof AuthoringRequestError && error.uncertain)}
    finally {setSaving(false)}
  }

  const preview = (() => {
    if (question.question_text) return question.question_text
    if (!question.content) return '(no question body)'
    try {
      const content = question.content.content as Array<Record<string, unknown>> | undefined
      if (!content) return '(rich content)'
      const firstPara = content.find((n) => n.type === 'paragraph')
      if (!firstPara) return '(rich content)'
      const children = firstPara.content as Array<Record<string, unknown>> | undefined
      if (!children) return '(empty)'
      return children.filter((n) => n.type === 'text').map((n) => n.text as string).join('') || '(rich content)'
    } catch { return '(rich content)' }
  })()

  const initialForm: QuestionFormState = {
    question_type: question.question_type,
    content: question.content ?? emptyDoc(),
    options: question.options ?? ['', '', '', ''],
    correct_answer: question.correct_answer ?? (question.question_type === 'true_false' ? 'true' : '0'),
    accepted_answers: question.accepted_answers ?? [''],
    explanation_content: question.explanation_content ?? emptyDoc(),
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      {questionError && <p role="alert">{questionError}</p>}
      {editing ? (
        <div style={{ padding: '1rem' }}>
          <p style={{ margin: '0 0 1rem', fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
            Editing question {index + 1}
          </p>
          <QuestionForm
            initial={initialForm}
            courseId={courseId}
            onSave={handleSave}
            onCancel={() => setEditing(false)}
            saving={saving || uncertain}
            editorPacks={editorPacks}
          />
        </div>
      ) : (
        <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)', minWidth: 20, paddingTop: 2 }}>{index + 1}.</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 'var(--radius-full)', background: bg, color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {TYPE_LABELS[question.question_type]}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text)', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {preview}
            </p>
            {question.question_type === 'multiple_choice' && question.options && question.correct_answer && (
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
                ✓ {question.options[Number(question.correct_answer)] ?? question.correct_answer}
              </p>
            )}
            {question.question_type === 'true_false' && question.correct_answer && (
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
                ✓ {question.correct_answer.charAt(0).toUpperCase() + question.correct_answer.slice(1)}
              </p>
            )}
            {question.question_type === 'short_answer' && question.accepted_answers && (
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
                Accepted: {question.accepted_answers.join(', ')}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button type="button" disabled={saving || uncertain} onClick={() => setEditing(true)} className="btn btn-ghost btn-sm">Edit</button>
            <button type="button" disabled={saving || uncertain} onClick={handleDelete} className="btn btn-sm" style={{ background: 'none', color: 'var(--danger)', border: 'none', cursor: 'pointer', fontSize: 13 }}>
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EditAssessmentPage() {
  const router = useRouter()
  const params = useParams()
  const courseSlug = params.slug as string
  const assessmentId = params.assessmentId as string

  const [courseId, setCourseId] = useState<string | null>(null)
  const [editorPacks, setEditorPacks] = useState<string[]>([])
  const [modules, setModules] = useState<{ id: string; title: string }[]>([])
  const [assessment, setAssessment] = useState<AssessmentData | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [editingQuestions, setEditingQuestions] = useState<Record<string,boolean>>({})
  const reportQuestionEditing = useCallback((id:string,open:boolean)=>setEditingQuestions(previous => !!previous[id]===open ? previous : {...previous,[id]:open}),[])
  const [addingQuestion, setAddingQuestion] = useState(false)
  const [savingQuestion, setSavingQuestion] = useState(false)
  const [questionUncertain, setQuestionUncertain] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  const [title, setTitle] = useState('')
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('quiz')
  const [passingScore, setPassingScore] = useState(70)
  const [isGraded, setIsGraded] = useState(true)
  const [isPublished, setIsPublished] = useState(false)
  const [editorKey, setEditorKey] = useState(0)
  const [version, setVersion] = useState(1)
  const [saveAction, setSaveAction] = useState('draft')
  const [resources, setResources] = useState<ResourceSelection[]>([])
  const [metadata, setMetadata] = useState(() => itemMetadata({}, 'assessment'))
  const [moduleId, setModuleId] = useState<string | null>(null)
  const [introContent, setIntroContent] = useState<Record<string, unknown>>(emptyDoc())
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const ready = loadedId === assessmentId
  const introExportRef=useRef<((format:'html'|'markdown'|'txt')=>void)|null>(null)
  const importIntroRef=useRef<((doc:Record<string,unknown>)=>void)|null>(null)
  const insertLatexIntroRef = useRef<((latex: string, display: boolean) => void) | null>(null)
  const [showLatexIntro, setShowLatexIntro] = useState(false)

  const draftFields = {title, assessment_type:assessmentType, module_id:moduleId, is_graded:isGraded, passing_score:passingScore, intro_content:introContent, resources, ...metadata}
  const draft = useDraft(JSON.stringify(draftFields), assessmentId, version, ready)
  const saving = draft.state.status === 'saving'

  const recovery=recoveryOptions('assessment',draftFields,v=>{
    if(v.title!==undefined)setTitle(v.title);
    if(v.assessment_type!==undefined)setAssessmentType(v.assessment_type);
    if(v.is_graded!==undefined)setIsGraded(v.is_graded);
    if(v.passing_score!==undefined)setPassingScore(v.passing_score);
    if(v.intro_content!==undefined)setIntroContent(v.intro_content);
    if(v.resources!==undefined)setResources(v.resources);
    setMetadata(current=>({...current,...(v.estimated_minutes!==undefined?{estimated_minutes:v.estimated_minutes}:{}),...(v.is_required!==undefined?{is_required:v.is_required}:{}),...(v.activity_type!==undefined?{activity_type:v.activity_type}:{}),...(v.placement!==undefined?{placement:v.placement}:{})}));
    setSaveAction('draft');setEditorKey(k=>k+1)
  },courseId,!ready||saving)
  const loadQuestions = useCallback(async (cId: string) => {
    const data = await requestJson<Question[]>(`/api/admin/courses/${cId}/assessments/${assessmentId}/questions`)
    if (!Array.isArray(data)) throw new Error('Unable to load questions: unexpected response.')
    setQuestions(data)
  }, [assessmentId])

  useEffect(() => {
    let active = true
    setLoadedId(null);setLoading(true);setError('')
    requestJson<{ id: string }>(`/api/admin/course-id-by-slug?slug=${encodeURIComponent(courseSlug)}`)
      .then(async (data) => {
        if (!active) return
        if (!data.id) throw new Error('Course not found.')
        setCourseId(data.id)

        const [assessmentRes, modsRes, courseRes, questionsRes] = await Promise.all([
          requestJson<AssessmentData>(`/api/admin/courses/${data.id}/assessments/${assessmentId}`),
          requestJson<{ id: string; title: string }[]>(`/api/admin/courses/${data.id}/modules`),
          requestJson<{ editor_tools?: string[] }>(`/api/admin/courses/${data.id}`),
          requestJson<Question[]>(`/api/admin/courses/${data.id}/assessments/${assessmentId}/questions`),
        ])

        if (!active) return
        if (!assessmentRes.id || !Array.isArray(questionsRes)) throw new Error('Unable to load the assessment and its questions. Please reload.')
        setAssessment(assessmentRes)
        setTitle(assessmentRes.title ?? '')
        setVersion(assessmentRes.version)
        setResources(resourceSelection(assessmentRes.resources ?? []))
        setMetadata(itemMetadata(assessmentRes, 'assessment'))
        setAssessmentType(assessmentRes.assessment_type ?? 'quiz')
        setPassingScore(assessmentRes.passing_score ?? 70)
        setIsGraded(assessmentRes.is_graded ?? true)
        setIsPublished(assessmentRes.is_published ?? false)
        setModuleId(assessmentRes.module_id ?? null)
        setIntroContent(assessmentRes.intro_content ?? emptyDoc())
        setModules(Array.isArray(modsRes) ? modsRes : [])
        setEditorPacks(Array.isArray(courseRes.editor_tools) ? courseRes.editor_tools : [])
        setQuestions(Array.isArray(questionsRes) ? questionsRes : [])
        setLoadedId(assessmentId)
      })
      .catch(failure => active && setError(failure instanceof Error ? failure.message : 'Unable to load this assessment.'))
      .finally(() => {if(active)setLoading(false)})
    return () => {active=false}
  }, [courseSlug, assessmentId])

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!courseId || !ready || saving || deleting || addingQuestion || Object.values(editingQuestions).some(Boolean)) return
    setError('')
    const action=saveAction
    const saved=await draft.save(`/api/admin/courses/${courseId}/assessments/${assessmentId}`, {...draftFields,action})
    if(saved){if(action!=='draft')setIsPublished(action==='publish');setSaveAction('draft')}
  }

  const handleAddQuestion = async (form: QuestionFormState) => {
    if (!courseId || savingQuestion || questionUncertain) return
    setError('');setSavingQuestion(true)

    const payload: Record<string, unknown> = {
      question_type: form.question_type,
      content: docIsEmpty(form.content) ? null : form.content,
      explanation_content: docIsEmpty(form.explanation_content) ? null : form.explanation_content,
    }

    if (form.question_type === 'multiple_choice') {
      Object.assign(payload, compactAnswerOptions(form.options, form.correct_answer))
    } else if (form.question_type === 'true_false') {
      payload.options = ['true', 'false']
      payload.correct_answer = form.correct_answer
    } else if (form.question_type === 'short_answer') {
      payload.accepted_answers = form.accepted_answers.filter((a) => a.trim())
    }

    try {
      await requestJson(`/api/admin/courses/${courseId}/assessments/${assessmentId}/questions`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}, 'question creation')
      setAddingQuestion(false)
      try { await loadQuestions(courseId) } catch { setError('Question added, but the list could not refresh. Reload before adding another.');setQuestionUncertain(true) }
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to add question. Your form is still here.');setQuestionUncertain(failure instanceof AuthoringRequestError && (failure.uncertain || failure.status===409)) }
    finally { setSavingQuestion(false) }
  }

  const handleDelete = async () => {
    if(!courseId || saving || deleting || !confirm('Archive this item? Its history will be preserved.'))return
    setDeleting(true);setError('')
    try {await requestJson(`/api/admin/courses/${courseId}/assessments/${assessmentId}`,{method:'DELETE'},'archive');router.push(`/admin/courses/${courseSlug}`)}
    catch(e){setError(e instanceof Error ? e.message : 'Unable to archive.');setDeleting(false)}
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-3)' }}>
      Loading…
    </div>
  )

  if (!assessment) return (
    <main className="page">
      <p role="alert" style={{ color: 'var(--danger)' }}>{error || 'Assessment not found.'}</p>
      <Link href={`/admin/courses/${courseSlug}`}>← Back to course</Link>
    </main>
  )

  const typeLabel = assessmentType.charAt(0).toUpperCase() + assessmentType.slice(1)

  return (
    <main className="page">
      <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: '1.25rem' }}>
        <Link href="/admin/courses" style={{ color: 'var(--text-3)' }}>My courses</Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <Link href={`/admin/courses/${courseSlug}`} style={{ color: 'var(--text-3)' }}>{courseSlug}</Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <span style={{ color: 'var(--text-2)' }}>Edit {typeLabel.toLowerCase()}</span>
      </div>

      <h1 style={{ margin: '0 0 2rem' }}>Edit {typeLabel.toLowerCase()}</h1>

      <p style={{ color: 'var(--text-2)' }}>{title} · {isPublished ? 'Published' : 'Draft'}</p>
      {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
      {/* Questions section */}
      <section id="assessment-questions" aria-labelledby="questions-heading" style={{ margin: '1.5rem 0 2.5rem' }}> 
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: '1.25rem' }}>
          <div>
            <h2 id="questions-heading" style={{ margin: '0 0 2px', fontSize: '1.1rem', fontFamily: 'var(--font-serif)' }}>Questions</h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)' }}>
              {questions.length} question{questions.length !== 1 ? 's' : ''}
              {isGraded && questions.length > 0 && ` · ${passingScore}% to pass`}
            </p>
          </div>
          {!addingQuestion && (
            <button type="button" disabled={isPublished || saving || questionUncertain} onClick={() => setAddingQuestion(true)} className="btn btn-primary">
              + Add question
            </button>
          )}
        </div>

        <p style={{ color: 'var(--text-2)' }}>Add a question, choose its type, then enter answer choices and mark the correct answer. Questions are saved separately from assessment settings.</p>
        {isPublished && <p role="status">Question editing is locked while this assessment is published. In <a href="#assessment-settings" style={{ textDecoration: 'underline' }}>settings below</a>, choose “Save and unpublish” and save before editing questions.</p>}
        <fieldset disabled={isPublished || saving} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <legend style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)' }}>Assessment questions</legend>
        {questions.length === 0 && !addingQuestion && (
          <div style={{ padding: '2rem', textAlign: 'center', border: '1.5px dashed var(--border)', borderRadius: 'var(--radius-lg)', color: 'var(--text-3)', fontSize: 14 }}>
            No questions yet. Add your first question above.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: addingQuestion ? '1.5rem' : 0 }}>
          {questions.map((q, i) => (
            <QuestionRow
              key={q.id}
              question={q}
              index={i}
              courseId={courseId ?? ''}
              assessmentId={assessmentId}
              editorPacks={editorPacks}
              onEditingChange={reportQuestionEditing}
              onUpdated={() => loadQuestions(courseId ?? '')}
              onDeleted={() => loadQuestions(courseId ?? '')}
            />
          ))}
        </div>

        {addingQuestion && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', background: 'var(--surface)' }}>
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 700 }}>New question</h3>
            <QuestionForm
              initial={emptyForm()}
              courseId={courseId ?? ''}
              onSave={handleAddQuestion}
              onCancel={() => setAddingQuestion(false)}
              saving={savingQuestion || questionUncertain}
              editorPacks={editorPacks}
            />
          </div>
        )}
        </fieldset>
      </section>

      <h2 id="assessment-settings" style={{ scrollMarginTop: 72 }}>Assessment settings &amp; introduction</h2>
      <p style={{ color: 'var(--text-2)' }}>The introduction is optional text students read before answering. Use the Questions section above to build the quiz or exam.</p>
      <DraftStatus session={draft} fields={draftFields} kind="assessment" overview={`/admin/courses/${courseSlug}`} />
      <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        <div>
          <label style={labelStyle}>Title <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input className="input" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        {modules.length > 0 && (
          <div>
            <label style={labelStyle}>Module</label>
            <select className="input" value={moduleId ?? ''} onChange={(e) => setModuleId(e.target.value || null)}>
              <option value="">— No module (course-level) —</option>
              {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
          </div>
        )}

        <div>
          <label style={labelStyle}>Type</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['quiz', 'exam', 'practice'] as AssessmentType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setAssessmentType(t); setIsGraded(t !== 'practice') }}
                className={`btn btn-sm ${assessmentType === t ? 'btn-secondary' : 'btn-ghost'}`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {isGraded && (
          <div>
            <label style={labelStyle}>Passing score: <strong>{passingScore}%</strong></label>
            <input type="range" min={0} max={100} step={5} value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--indigo)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)' }}>
              <span>0%</span><span>100%</span>
            </div>
          </div>
        )}

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              Introduction <span style={optStyle}>(shown before questions, optional)</span>
            </label>
            <MarkdownImport recovery={recovery} hasExistingContent={!docIsEmpty(introContent)} metadataFields={['title','estimated_minutes','activity_type','is_required']} onInsert={doc=>importIntroRef.current?.(doc)} onMetadata={values=>{if(values.title!==undefined)setTitle(values.title);setMetadata(current=>({...current,...importedLearningSettings(values)}))}} />
            <EditorDownload recovery={recovery} onDownload={format=>introExportRef.current?.(format)} />
            {editorPacks.includes('math') && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowLatexIntro(true)}>∑ Math</button>
            )}
          </div>
          {ready && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <TipTapEditor onExportReady={fn=>{introExportRef.current=fn}} onEditorReady={fn=>{importIntroRef.current=fn}} exportMetadata={{title,kind:'assessment',section:'introduction',course_slug:courseSlug,item_id:assessmentId,module_id:moduleId,assessment_type:assessmentType,is_graded:isGraded,passing_score:passingScore,...metadata}} courseId={courseId ?? undefined}
                key={`assessment-intro-${editorKey}`}
                packs={editorPacks.includes('math') ? ['math'] : []}
                content={docIsEmpty(introContent) ? undefined : introContent}
                onChange={setIntroContent}
                onLatexButtonClick={() => setShowLatexIntro(true)}
                onInsertLatex={(fn) => { insertLatexIntroRef.current = fn }}
              />
            </div>
          )}
        </div>

        {assessmentId && <RevisionHistory itemId={assessmentId} onRestore={v => { if(saving || deleting)return; setEditorKey(k => k+1); setTitle(String(v.title ?? '')); setIntroContent((v.intro_content ?? {}) as Record<string, unknown>); setAssessmentType(v.assessment_type as AssessmentType); setIsGraded(Boolean(v.is_graded)); setPassingScore(Number(v.passing_score ?? 70)); setModuleId(v.module_id as string | null); if (Array.isArray(v.resources)) setResources(resourceSelection(v.resources)); setMetadata(itemMetadata(v, 'assessment')); setSaveAction('draft'); }} />}
        {assessmentId && <AssetLibrary courseId={courseId ?? undefined} value={resources} onChange={setResources} disabled={saving || deleting || !ready} />}
        <ItemMetadataFields value={metadata} onChange={setMetadata} />
        <label>When saving<select className="input" value={saveAction} onChange={e => setSaveAction(e.target.value)}><option value="draft">Save draft — keep the published version unchanged</option><option value="publish">Publish these changes</option><option value="unpublish">Save and unpublish</option></select></label>
        <p>{isPublished ? 'A published version is available to learners.' : 'This item is not published.'}</p>

        

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={!draft.canSave || deleting || !title.trim() || !courseId || addingQuestion || Object.values(editingQuestions).some(Boolean)} className="btn btn-primary">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <Link href={`/admin/courses/${courseSlug}`}>
            <button type="button" className="btn btn-ghost">Cancel</button>
          </Link>
        </div>
      </form>

      {/* Danger zone */}
      <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: 15, color: 'var(--danger)' }}>Danger zone</h3>
        <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 1rem' }}>
          Archive this {typeLabel.toLowerCase()}. Its questions, history, and learning records will be preserved.
        </p>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting || saving || !draft.canSave}
          className="btn btn-sm"
          style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: 'none', opacity: deleting ? 0.6 : 1 }}
        >
          {deleting ? 'Archiving…' : `Archive ${typeLabel.toLowerCase()}`}
        </button>
      </div>

      {showLatexIntro && editorPacks.includes('math') && (
        <LatexModal
          onInsert={(latex, displayMode) => { insertLatexIntroRef.current?.(latex, displayMode); setShowLatexIntro(false) }}
          onClose={() => setShowLatexIntro(false)}
          showDisplayToggle
        />
      )}
    </main>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)',
}
const hintStyle: React.CSSProperties = {
  fontSize: 12, color: 'var(--text-3)', margin: '4px 0 0', lineHeight: 1.5,
}
const optStyle: React.CSSProperties = {
  fontWeight: 400, color: 'var(--text-3)', fontSize: 12,
}
