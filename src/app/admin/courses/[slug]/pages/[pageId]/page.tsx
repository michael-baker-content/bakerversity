'use client'
import { recoveryOptions } from '@/lib/authoring/recovery'
import {importedLearningSettings} from '@/lib/authoring/importMetadata'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import ItemMetadataFields, { itemMetadata } from '@/components/ItemMetadataFields'
import AssetLibrary from '@/components/AssetLibrary'
import { resourceSelection, type ResourceSelection } from '@/lib/authoring/resources'
import { useDraft } from '@/lib/authoring/useDraft'
import DraftStatus from '@/components/DraftStatus'
import RevisionHistory from '@/components/RevisionHistory'
import CoursePageContentEditor from '@/components/CoursePageContentEditor'
import { requestJson } from '@/lib/authoring/request'




const PAGE_TYPES = [
  { value: 'overview',      label: 'Overview' },
  { value: 'introduction',  label: 'Introduction' },
  { value: 'syllabus',      label: 'Syllabus' },
  { value: 'requirements',  label: 'Requirements' },
  { value: 'resources',     label: 'Resources' },
  { value: 'conclusion',    label: 'Conclusion' },
  { value: 'custom',        label: 'Custom' },
]

const INTRO_TYPES = ['introduction', 'conclusion']

export default function EditCoursePage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const pageId = params.pageId as string


  const [courseId, setCourseId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const ready = loadedId === pageId
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [pageType, setPageType] = useState('custom')
  const [introduction, setIntroduction] = useState('')
  const [content, setContent] = useState<Record<string, unknown>>({})
  const [isPublished, setIsPublished] = useState(false)
  const [editorKey, setEditorKey] = useState(0)
  const [version, setVersion] = useState(1)
  const [saveAction, setSaveAction] = useState('draft')
  const [resources, setResources] = useState<ResourceSelection[]>([])
  const [metadata, setMetadata] = useState(() => itemMetadata({}, 'page'))

  const draftFields = {title, page_type:pageType, introduction:introduction || null, content, resources, ...metadata}
  const draft = useDraft(JSON.stringify(draftFields), pageId, version, ready)
  const saving = draft.state.status === 'saving'

  useEffect(() => {
    let active = true
    setLoadedId(null);setLoading(true);setError('')
    requestJson<{id:string}>(`/api/admin/course-id-by-slug?slug=${encodeURIComponent(slug)}`)
      .then(async (data) => {
        if (!active) return
        if (!data.id) throw new Error('Course not found.')
        setCourseId(data.id)
        const [pageRes] = await Promise.all([
          requestJson<Partial<import('@/components/ItemMetadataFields').ItemMetadata> & {title:string;version:number;resources?:ResourceSelection[];page_type:string;introduction:string;content:Record<string,unknown>;is_published:boolean}>(`/api/admin/courses/${data.id}/pages/${pageId}`),
        ])
        if (!active) return
        if (!Number.isInteger(pageRes.version)) throw new Error('Unable to load the saved page safely.')
        setTitle(pageRes.title ?? '')
        setVersion(pageRes.version)
        setResources(resourceSelection(pageRes.resources ?? []))
        setMetadata(itemMetadata(pageRes, 'page'))
        setPageType(pageRes.page_type ?? 'custom')
        setIntroduction(pageRes.introduction ?? '')
        setContent(pageRes.content ?? {})
        setIsPublished(pageRes.is_published ?? false)
        setLoadedId(pageId)
      })
      .catch(e=>active && setError(e instanceof Error ? e.message : 'Unable to load page.'))
      .finally(() => {if(active)setLoading(false)})
    return () => {active=false}
  }, [slug, pageId])

  const recovery=recoveryOptions('page',draftFields,v=>{
    if(v.title!==undefined)setTitle(v.title);
    if(v.introduction!==undefined)setIntroduction(v.introduction??'');
    if(v.content!==undefined)setContent(v.content);
    if(v.page_type!==undefined)setPageType(v.page_type);
    if(v.resources!==undefined)setResources(v.resources);
    setMetadata(current=>({...current,...(v.estimated_minutes!==undefined?{estimated_minutes:v.estimated_minutes}:{}),...(v.is_required!==undefined?{is_required:v.is_required}:{}),...(v.activity_type!==undefined?{activity_type:v.activity_type}:{}),...(v.placement!==undefined?{placement:v.placement}:{})}));
    setSaveAction('draft');setEditorKey(k=>k+1)
  },courseId,!ready||saving||deleting)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!courseId || !ready || saving || deleting) return
    setError('')
    const action=saveAction
    const saved=await draft.save(`/api/admin/courses/${courseId}/pages/${pageId}`, {...draftFields,action})
    if(saved){if(action!=='draft')setIsPublished(action==='publish');setSaveAction('draft')}
  }

  const handleDelete = async () => {
    if(!courseId || saving || deleting || !confirm('Archive this item? Its history will be preserved.'))return
    setDeleting(true);setError('')
    try {await requestJson(`/api/admin/courses/${courseId}/pages/${pageId}`,{method:'DELETE'},'archive');router.push(`/admin/courses/${slug}`)}
    catch(e){setError(e instanceof Error ? e.message : 'Unable to archive.');setDeleting(false)}
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-3)' }}>
      Loading…
    </div>
  )

  if(!ready)return <main className="page"><p role="alert">{error || 'Unable to load this page.'}</p><button type="button" onClick={()=>window.location.reload()}>Retry loading</button></main>

  return (
    <main className="page">
      <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: '1.25rem' }}>
        <Link href="/admin/courses" style={{ color: 'var(--text-3)' }}>My courses</Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <Link href={`/admin/courses/${slug}`} style={{ color: 'var(--text-3)' }}>{slug}</Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <span style={{ color: 'var(--text-2)' }}>Edit page</span>
      </div>

      <h1 style={{ margin: '0 0 2rem' }}>Edit page</h1>

      <DraftStatus session={draft} fields={draftFields} kind="page" overview={`/admin/courses/${slug}`} />
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Page type */}
        <div>
          <label style={labelStyle}>Page type</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PAGE_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setPageType(t.value)}
                className={`btn btn-sm ${pageType === t.value ? 'btn-secondary' : 'btn-ghost'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label style={labelStyle}>Title <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input className="input" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        {/* Introduction */}
        {INTRO_TYPES.includes(pageType) && (
          <div>
            <label style={labelStyle}>
              Introduction <span style={{ fontWeight: 400, color: 'var(--text-3)', fontSize: 12 }}>(plain text, shown prominently above content)</span>
            </label>
            <textarea
              className="input"
              value={introduction}
              onChange={(e) => setIntroduction(e.target.value)}
              rows={3}
            />
          </div>
        )}

        <CoursePageContentEditor recovery={recovery} metadataFields={['title','introduction','estimated_minutes','activity_type','is_required']} onImportMetadata={values=>{if(values.title!==undefined)setTitle(values.title);if(values.introduction!==undefined)setIntroduction(values.introduction);setMetadata(current=>({...current,...importedLearningSettings(values)}));}} exportMetadata={{title,kind:'page',course_slug:slug,item_id:pageId,page_type:pageType,introduction,...metadata}} resetKey={editorKey} courseId={courseId} content={content} onChange={setContent} />

        {/* Published */}
        {pageId && <RevisionHistory itemId={pageId} onRestore={v => { if(saving || deleting)return; setEditorKey(k => k+1); setTitle(String(v.title ?? '')); setIntroduction(String(v.introduction ?? '')); setContent((v.content ?? {}) as Record<string, unknown>); setPageType(String(v.page_type ?? 'custom')); if (Array.isArray(v.resources)) setResources(resourceSelection(v.resources)); setMetadata(itemMetadata(v, 'page')); setSaveAction('draft'); }} />}
        {pageId && <AssetLibrary courseId={courseId ?? undefined} value={resources} onChange={setResources} disabled={saving || deleting || !ready} />}
        <ItemMetadataFields value={metadata} onChange={setMetadata} />
        <label>When saving<select className="input" value={saveAction} onChange={e => setSaveAction(e.target.value)}><option value="draft">Save draft — keep the published version unchanged</option><option value="publish">Publish these changes</option><option value="unpublish">Save and unpublish</option></select></label>
        <p>{isPublished ? 'A published version is available to learners.' : 'This item is not published.'}</p>

        {error && <p style={{ color: 'var(--danger)', fontSize: 14, margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={!draft.canSave || deleting || !title.trim() || !courseId} className="btn btn-primary">
            {saving ? 'Saving…' : 'Save page'}
          </button>
          <Link href={`/admin/courses/${slug}`}>
            <button type="button" className="btn btn-ghost">Cancel</button>
          </Link>
        </div>
      </form>

      {/* Danger zone */}
      <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: 15, color: 'var(--danger)' }}>Danger zone</h3>
        <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 1rem' }}>
          Archive this page while preserving its revisions and learning records.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting || saving || !draft.canSave}
          className="btn btn-sm"
          style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: 'none', opacity: deleting ? 0.6 : 1 }}
        >
          {deleting ? 'Archiving…' : 'Archive page'}
        </button>
      </div>
    </main>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }
