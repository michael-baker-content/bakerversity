'use client'
import { recoveryOptions } from '@/lib/authoring/recovery'
import {importedLearningSettings} from '@/lib/authoring/importMetadata'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import ItemMetadataFields, { itemMetadata } from '@/components/ItemMetadataFields'
import AssetLibrary from '@/components/AssetLibrary'
import { resourceSelection, type ResourceSelection } from '@/lib/authoring/resources'
import RevisionHistory from '@/components/RevisionHistory'
import dynamic from 'next/dynamic'
import { requestJson } from '@/lib/authoring/request'
import { uploadLessonPdf } from '@/lib/authoring/uploadPdf'
import { useAuthoringSession } from '@/lib/authoring/useAuthoringSession'
import { useUnsavedChanges, discardMessage } from '@/lib/authoring/useUnsavedChanges'
import MarkdownImport from '@/components/MarkdownImport'
import EditorDownload from '@/components/EditorDownload'
import type { MafsGraphAttrs } from '@/components/MafsGraph'

const TipTapEditor = dynamic(() => import('@/components/TipTapEditor'), { ssr: false })
const MafsGraphEditor = dynamic(() => import('@/components/MafsGraphEditor'), { ssr: false })
const LatexModal = dynamic(() => import('@/components/LatexModal'), { ssr: false })

type LessonData = {
  title: string; slug: string | null; introduction: string | null; content: Record<string, unknown> | null;
  module_id: string | null; slides_url: string | null; slides_meta: { title?: string; description?: string } | null;
  resources?: ResourceSelection[]; version: number; is_published: boolean; is_required?: boolean; estimated_minutes?: number | null; activity_type?: string; placement?: string;
}
function lessonValues(lesson: LessonData) {
  return { title: lesson.title ?? '', lessonSlug: lesson.slug ?? '', introduction: lesson.introduction ?? '',
    content: lesson.content ?? {}, moduleId: lesson.module_id ?? null, metadata: itemMetadata(lesson, 'lesson'),
    slidesUrl: lesson.slides_url ?? '', slidesTitle: lesson.slides_meta?.title ?? '', slidesDescription: lesson.slides_meta?.description ?? '', resources: resourceSelection(lesson.resources ?? []) }
}

export default function EditLessonPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const lessonParam = params.lessonId as string

  const [courseId, setCourseId] = useState<string | null>(null)
  const [editorTools, setEditorTools] = useState<string[]>([])
  const [modules, setModules] = useState<{ id: string; title: string }[]>([])
  const [moduleId, setModuleId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [lessonUuid, setLessonUuid] = useState<string | null>(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lessonParam) ? lessonParam : null
  )
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const insertFnRef = useRef<((doc: Record<string, unknown>) => void) | null>(null)
  const insertGraphRef = useRef<((attrs: MafsGraphAttrs) => void) | null>(null)
  const insertLatexRef = useRef<((latex: string, displayMode: boolean) => void) | null>(null)
  const [exportReady,setExportReady]=useState(false)
  const exportRef = useRef<((format: 'html' | 'markdown' | 'txt') => void) | null>(null)
  const [showGraphEditor, setShowGraphEditor] = useState(false)
  const [showLatexModal, setShowLatexModal] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [lessonSlug, setLessonSlug] = useState('')
  const [introduction, setIntroduction] = useState('')
  const [content, setContent] = useState<Record<string, unknown>>({})
  const [isPublished, setIsPublished] = useState(false)
  const [editorKey, setEditorKey] = useState(0)
  const [saveAction, setSaveAction] = useState('draft')
  const [hasSaved, setHasSaved] = useState(false)
  const [resources, setResources] = useState<ResourceSelection[]>([])
  const [metadata, setMetadata] = useState(() => itemMetadata({}, 'lesson'))
  const [slidesUrl, setSlidesUrl] = useState('')
  const [slidesType, setSlidesType] = useState<'pdf' | 'google-slides' | 'none'>('none')
  const [slidesTitle, setSlidesTitle] = useState('')
  const [slidesDescription, setSlidesDescription] = useState('')
  const [slidesUploading, setSlidesUploading] = useState(false)
  const [slidesError, setSlidesError] = useState('')
  const [slidesProgress, setSlidesProgress] = useState(0)
  const slidesFileRef = useRef<HTMLInputElement>(null)

  const [loadError, setLoadError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const snapshot = JSON.stringify({ title, lessonSlug, introduction, content, moduleId, metadata, slidesUrl, slidesTitle, slidesDescription, resources })
  const session = useAuthoringSession(snapshot, `${slug}/${lessonParam}`)
  const { initialize } = session
  const saving = session.state.status === 'saving'
  useUnsavedChanges(ready && (session.needsProtection || slidesUploading))

  useEffect(() => {
    const controller = new AbortController()
    const signal = controller.signal
    setLoading(true); setReady(false); setLoadError(''); setError(''); setHasSaved(false)
    async function load() {
      try {
        const courseRef = await requestJson<{ id: string }>(`/api/admin/course-id-by-slug?slug=${encodeURIComponent(slug)}`, { signal })
        if (!courseRef.id) throw new Error('Course not found.')
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lessonParam)
        const lessonRef = isUuid ? { id: lessonParam } : await requestJson<{ id: string }>(`/api/admin/lesson-id-by-slug?courseId=${courseRef.id}&slug=${encodeURIComponent(lessonParam)}`, { signal })
        if (!lessonRef.id) throw new Error('Lesson not found.')
        const [lesson, mods, course] = await Promise.all([
          requestJson<LessonData>(`/api/admin/courses/${courseRef.id}/lessons/${lessonRef.id}`, { signal }),
          requestJson<{ id: string; title: string }[]>(`/api/admin/courses/${courseRef.id}/modules`, { signal }),
          requestJson<{ editor_tools: string[] }>(`/api/admin/courses/${courseRef.id}`, { signal }),
        ])
        if (signal.aborted) return
        if (!Number.isInteger(lesson.version) || lesson.version < 1 || typeof lesson.title !== 'string' || !Array.isArray(mods)) throw new Error('The lesson could not be loaded safely. Please retry.')
        const value = lessonValues(lesson)
        setCourseId(courseRef.id); setLessonUuid(lessonRef.id)
        setTitle(value.title); setLessonSlug(value.lessonSlug); setIntroduction(value.introduction); setContent(value.content)
        setModuleId(value.moduleId); setMetadata(value.metadata); setSlidesUrl(value.slidesUrl)
        setSlidesTitle(value.slidesTitle); setSlidesDescription(value.slidesDescription); setResources(value.resources)
        setSlidesType(value.slidesUrl.includes('docs.google.com') ? 'google-slides' : value.slidesUrl ? 'pdf' : 'none')
        setIsPublished(lesson.is_published); setModules(mods); setEditorTools(Array.isArray(course.editor_tools) ? course.editor_tools : [])
        initialize(JSON.stringify(value), lesson.version)
        setSaveAction('draft'); setEditorKey(k => k + 1); setReady(true)
      } catch (failure) {
        if (!signal.aborted) setLoadError(failure instanceof Error ? failure.message : 'Unable to load lesson.')
      } finally { if (!signal.aborted) setLoading(false) }
    }
    void load()
    return () => controller.abort()
  }, [slug, lessonParam, loadAttempt, initialize])

  function reloadLatest() {
    if (saving || slidesUploading) return
    if (session.needsProtection && !window.confirm(discardMessage)) return
    setLoadAttempt(n => n + 1)
  }


  const recovery=recoveryOptions('lesson', {title,introduction,content,metadata,slidesUrl,slidesTitle,slidesDescription,resources},v=>{
    if(v.title!==undefined)setTitle(v.title);
    if(v.introduction!==undefined)setIntroduction(v.introduction);
    if(v.content!==undefined)setContent(v.content);
    if(v.metadata!==undefined)setMetadata(current=>({...current,...v.metadata}));
    if(v.resources!==undefined)setResources(v.resources);
    if(v.slidesUrl!==undefined){setSlidesUrl(v.slidesUrl);setSlidesType(v.slidesUrl.includes('docs.google.com')?'google-slides':v.slidesUrl?'pdf':'none');}
    if(v.slidesTitle!==undefined)setSlidesTitle(v.slidesTitle);
    if(v.slidesDescription!==undefined)setSlidesDescription(v.slidesDescription);
    setSaveAction('draft');setHasSaved(false);setEditorKey(k=>k+1)
  },courseId,!ready||saving||deleting||slidesUploading)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ready || !courseId || !lessonUuid || slidesUploading || deleting) return
    setError('')
    const action = saveAction
    const saved = await session.save(`/api/admin/courses/${courseId}/lessons/${lessonUuid}`, {
      title, slug: lessonSlug || undefined, introduction: introduction || null, content,
      action, resources, ...metadata, module_id: moduleId ?? null, slides_url: slidesUrl || null,
      slides_meta: (slidesTitle || slidesDescription) ? { title: slidesTitle || undefined, filename: slidesUrl ? slidesUrl.split('/').pop() : undefined, description: slidesDescription || undefined } : null,
    })
    if (saved) {
      setHasSaved(true)
      if (action !== 'draft') setIsPublished(action === 'publish')
      setSaveAction('draft')
    }
  }

  const handleDelete = async () => {
    if (!courseId || !lessonUuid || saving || deleting) return
    if (!confirm('Archive this lesson? Its history will be preserved. Any unsaved editor changes will be discarded.')) return
    setDeleting(true); setError('')
    try {
      await requestJson(`/api/admin/courses/${courseId}/lessons/${lessonUuid}`, { method: 'DELETE' })
      router.push(`/admin/courses/${slug}`)
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to archive.') }
    finally { setDeleting(false) }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-3)' }}>
      Loading…
    </div>
  )

  if (loadError || !ready) return <main className="page"><h1>Unable to open lesson</h1><p role="alert">{loadError || 'The lesson is not available.'}</p><button type="button" className="btn btn-primary" onClick={() => setLoadAttempt(n => n + 1)}>Retry loading</button> <Link href={`/admin/courses/${slug}`}>Back to course</Link></main>

  return (
    <main className="page">
      <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: '1.25rem' }}>
        <Link href="/admin/courses" style={{ color: 'var(--text-3)' }}>My courses</Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <Link href={`/admin/courses/${slug}`} style={{ color: 'var(--text-3)' }}>{slug}</Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <span style={{ color: 'var(--text-2)' }}>Edit lesson</span>
      </div>

      <h1 style={{ margin: '0 0 1rem' }}>Edit lesson</h1>
      <p role="status" aria-live="polite">{saving ? 'Saving… You can continue editing.' : session.dirty ? 'You have unsaved changes.' : session.state.status === 'saved' ? 'Changes saved.' : 'No unsaved changes.'}</p>
      {session.state.message && ['failed', 'conflict', 'uncertain'].includes(session.state.status) && <div role="alert"><p>{session.state.message}</p>{['conflict', 'uncertain'].includes(session.state.status) && <p>Further saves are paused until you reload. Use Download → Recovery copy before reloading, then Import from file → Restore recovery copy.</p>}<button type="button" className="btn btn-ghost" onClick={reloadLatest}>Reload latest version</button></div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Title */}
        <div>
          <label htmlFor="lesson-title" style={labelStyle}>Title <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input id="lesson-title" className="input" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        {/* Slug */}
        <div>
          <label style={labelStyle}>URL slug</label>
          <input
            className="input"
            type="text"
            value={lessonSlug}
            onChange={(e) => setLessonSlug(e.target.value)}
            placeholder="auto-generated from title"
          />
          <p style={hintStyle}>Used in the lesson URL: /courses/{slug}/lessons/{lessonSlug || 'your-slug'}</p>
        </div>

        {/* Module */}
        {modules.length > 0 && (
          <div>
            <label style={labelStyle}>Module</label>
            <select
              className="input"
              value={moduleId ?? ''}
              onChange={(e) => setModuleId(e.target.value || null)}
            >
              <option value="">— No module —</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
          </div>
        )}

        {/* Introduction */}
        <div>
          <label style={labelStyle}>Introduction <span style={optStyle}>(plain text, shown above content)</span></label>
          <textarea className="input" value={introduction} onChange={(e) => setIntroduction(e.target.value)} rows={3} />
        </div>

        {/* Content */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={labelStyle}>Content</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <MarkdownImport recovery={recovery} metadataFields={['title','introduction','estimated_minutes','activity_type','is_required']} onMetadata={values=>{if(values.title!==undefined)setTitle(values.title);if(values.introduction!==undefined)setIntroduction(values.introduction);setMetadata(current=>({...current,...importedLearningSettings(values)}));}}
                hasExistingContent={Object.keys(content).length > 0}
                onInsert={(doc) => insertFnRef.current?.(doc)}
              />
              <EditorDownload ready={exportReady} recovery={recovery} onDownload={format => exportRef.current?.(format)} />
            </div>
          </div>
          {ready && (
            <TipTapEditor exportMetadata={{title,kind:'lesson',slug:lessonSlug,course_slug:slug,item_id:lessonUuid,module_id:moduleId,introduction,...metadata}} courseId={courseId ?? undefined}
              key={editorKey}
              packs={(editorTools as import('@/components/TipTapEditor').EditorPack[])}
              content={Object.keys(content).length > 0 ? content : undefined}
              onChange={setContent}
              onEditorReady={(fn) => { insertFnRef.current = fn }}
              onExportReady={(fn) => { exportRef.current = fn;setExportReady(!!fn) }}
              onGraphButtonClick={() => setShowGraphEditor(true)}
              onInsertGraph={(fn) => { insertGraphRef.current = fn }}
              onLatexButtonClick={() => setShowLatexModal(true)}
              onInsertLatex={(fn) => { insertLatexRef.current = fn }}
            />
          )}
        </div>

        {/* Slides */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
          <label style={labelStyle}>Slides <span style={optStyle}>(optional)</span></label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            {(['none', 'pdf', 'google-slides'] as const).map((t) => (
              <button
                key={t}
                type="button"
                disabled={slidesUploading}
                onClick={() => { setSlidesType(t); if (t === 'none') setSlidesUrl('') }}
                className={`btn btn-sm ${slidesType === t ? 'btn-secondary' : 'btn-ghost'}`}
              >
                {t === 'none' ? 'None' : t === 'pdf' ? 'Upload PDF' : 'Google Slides'}
              </button>
            ))}
          </div>

          {slidesType === 'pdf' && (
            <div>
              {slidesUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--success)' }}>✓ PDF uploaded</span>
                  <a href={slidesUrl} target="_blank" style={{ fontSize: 12, color: 'var(--indigo)' }}>View ↗</a>
                  <button type="button" disabled={slidesUploading} onClick={() => setSlidesUrl('')}
                    style={{ fontSize: 12, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Remove
                  </button>
                </div>
              )}
              <button type="button" onClick={() => slidesFileRef.current?.click()}
                disabled={slidesUploading} className="btn btn-ghost btn-sm">
                {slidesUploading ? (slidesProgress === 100 ? 'Confirming upload…' : `Uploading… ${slidesProgress}%`) : slidesUrl ? 'Replace PDF' : 'Choose PDF'}
              </button>
              <input ref={slidesFileRef} type="file" accept="application/pdf" style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setSlidesUploading(true); setSlidesError(''); setSlidesProgress(0)
                  const input = e.target
                  try {
                    const data = await uploadLessonPdf(file, setSlidesProgress)
                    setSlidesUrl(data.url)
                  } catch (failure) { setSlidesError(failure instanceof Error ? failure.message : 'Upload failed') }
                  finally { setSlidesUploading(false); input.value = '' }

                }} />
              <p style={hintStyle} role="status">{slidesUploading ? (slidesProgress === 100 ? 'Confirming the PDF in storage…' : `Uploading PDF: ${slidesProgress}%`) : 'PDF up to 50 MB. After uploading, save the lesson to attach it.'}</p>
              {slidesError && <p role="alert" style={{ fontSize: 12, color: 'var(--danger)', margin: '6px 0 0' }}>{slidesError}</p>}
            </div>
          )}

          {slidesType === 'google-slides' && (
            <div>
              <input className="input" type="url" value={slidesUrl} onChange={(e) => setSlidesUrl(e.target.value)}
                placeholder="https://docs.google.com/presentation/d/..." />
              <p style={hintStyle}>Paste the URL from File → Share → Publish to web in Google Slides.</p>
            </div>
          )}

          {slidesType !== 'none' && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={{ ...labelStyle, fontWeight: 400, color: 'var(--text-2)' }}>Slides title <span style={optStyle}>(optional)</span></label>
                <input className="input" type="text" value={slidesTitle} onChange={(e) => setSlidesTitle(e.target.value)} placeholder="e.g. Unit 1 Overview" />
              </div>
              <div>
                <label style={{ ...labelStyle, fontWeight: 400, color: 'var(--text-2)' }}>Slides description <span style={optStyle}>(optional)</span></label>
                <textarea className="input" value={slidesDescription} onChange={(e) => setSlidesDescription(e.target.value)}
                  rows={2} placeholder="Brief description of what these slides cover…" />
              </div>
            </div>
          )}
        </div>

        {/* Published */}
        {lessonUuid && <RevisionHistory key={session.state.version} itemId={lessonUuid} onRestore={v => { if (saving || (session.needsProtection && !window.confirm('Replace your local edits with this revision? This does not publish it.'))) return; setSlidesType(String(v.slides_url ?? '').includes('docs.google.com') ? 'google-slides' : v.slides_url ? 'pdf' : 'none'); setEditorKey(k => k+1); setTitle(String(v.title ?? '')); setIntroduction(String(v.introduction ?? '')); setContent((v.content ?? {}) as Record<string, unknown>); setLessonSlug(String(v.slug ?? '')); setModuleId(v.module_id as string | null); setSlidesUrl(String(v.slides_url ?? '')); const sm = v.slides_meta as { title?: string; description?: string } | null; setSlidesTitle(sm?.title ?? ''); setSlidesDescription(sm?.description ?? ''); if (Array.isArray(v.resources)) setResources(resourceSelection(v.resources)); setMetadata(itemMetadata(v, 'lesson')); setSaveAction('draft'); }} />}
        {lessonUuid && <AssetLibrary courseId={courseId ?? undefined} value={resources} onChange={setResources} disabled={!session.canSave || deleting} />}
        <ItemMetadataFields value={metadata} onChange={setMetadata} />
        <label>When saving<select className="input" value={saveAction} disabled={saving || deleting} onChange={e => setSaveAction(e.target.value)}><option value="draft">Save draft — keep the published version unchanged</option><option value="publish">Publish these changes</option><option value="unpublish">Save and unpublish</option></select></label>
        <p>{isPublished ? 'A published version is available to learners.' : 'This item is not published.'}</p>

        {error && <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p>}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: '0.5rem' }}>
          <button type="submit" disabled={!session.canSave || deleting || slidesUploading || !title.trim() || !courseId} className="btn btn-primary">
            {saving ? 'Saving…' : saveAction === 'publish' ? 'Publish changes' : saveAction === 'unpublish' ? 'Save and unpublish' : 'Save draft'}
          </button>
          {hasSaved && (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={session.needsProtection || slidesUploading || deleting}
              onClick={() => router.push(`/admin/courses/${slug}`)}
            >
              Back to course overview
            </button>
          )}
          <Link href={`/admin/courses/${slug}/lessons/${lessonUuid}/preview`} target="_blank" className="btn btn-ghost">Preview saved draft ↗</Link>
          <Link href={`/admin/courses/${slug}`} className="btn btn-ghost">Cancel</Link>
        </div>
      </form>



      {/* Delete */}
      <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: 15, color: 'var(--danger)' }}>Danger zone</h3>
        <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 1rem' }}>
          Archive this lesson while preserving its revisions and learning records.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting || saving || slidesUploading || ['conflict', 'uncertain'].includes(session.state.status)}
          className="btn btn-sm"
          style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: 'none', opacity: deleting ? 0.6 : 1 }}
        >
          {deleting ? 'Archiving…' : 'Archive lesson'}
        </button>
      </div>
      {/* Latex modal — lives at page level to avoid re-render instability */}
      {showLatexModal && editorTools.includes('math') && (
        <LatexModal
          onInsert={(latex, displayMode) => {
            insertLatexRef.current?.(latex, displayMode)
          }}
          onClose={() => setShowLatexModal(false)}
          showDisplayToggle
        />
      )}

      {/* Graph editor modal — lives at page level to avoid re-render instability */}
      {showGraphEditor && editorTools.includes('graph') && (
        <MafsGraphEditor
          onSave={(attrs) => {
            insertGraphRef.current?.(attrs)
            setShowGraphEditor(false)
          }}
          onClose={() => setShowGraphEditor(false)}
        />
      )}
    </main>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }
const hintStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text-3)', margin: '4px 0 0' }
const optStyle: React.CSSProperties = { fontWeight: 400, color: 'var(--text-3)', fontSize: 12 }
