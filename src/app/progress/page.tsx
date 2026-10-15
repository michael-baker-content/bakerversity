import { getLearningProgress } from '@/lib/learningProgress'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import SiteNav from '@/components/SiteNav'

export const metadata: Metadata = { title: 'My Progress · Bakerversity' }

export default async function ProgressPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const db = createServiceClient()
  const { data: user } = await db.from('users').select('id').eq('clerk_id',clerkId).single()
  const courses = user ? await getLearningProgress(user.id) : []

  return (
    <>
      <SiteNav />
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ margin: '0 0 0.5rem', fontFamily: 'var(--font-serif)' }}>My Progress</h1>
          <p style={{ color: 'var(--text-2)', margin: 0 }}>
            Progress counts required published lessons, pages and assessments. Optional resources do not affect completion.
          </p>
        </div>

        {courses.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '3rem 2rem',
            background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
          }}>
            <p style={{ fontSize: 18, color: 'var(--text-2)', marginBottom: '1rem' }}>
              You haven't enrolled in any courses yet.
            </p>
            <Link href="/courses">
              <button className="btn btn-primary">Browse courses</button>
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {courses.map(({ course, progress, modules, certificate }) => (
              <div
                key={course.id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.5rem',
                }}
              >
                {/* Header */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'flex-start', marginBottom: '1rem',
                  gap: 12, flexWrap: 'wrap',
                }}>
                  <div>
                    <Link href={`/courses/${course.slug}`} style={{ textDecoration: 'none' }}>
                      <h2 style={{
                        margin: '0 0 4px', fontSize: 18,
                        fontFamily: 'var(--font-serif)', color: 'var(--text)',
                      }}>
                        {course.title}
                      </h2>
                    </Link>
                    {course.description && (
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>
                        {course.description.slice(0, 120)}{course.description.length > 120 ? '…' : ''}
                      </p>
                    )}
                  </div>

                  <div style={{ flexShrink: 0 }}>
                    {certificate ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', borderRadius: 'var(--radius-full)',
                        background: 'var(--success-bg)', color: 'var(--success)',
                        fontSize: 12, fontWeight: 700,
                      }}>
                        🏆 Certificate earned
                      </span>
                    ) : progress.pct === 100 ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', borderRadius: 'var(--radius-full)',
                        background: 'var(--amber-muted)', color: 'var(--text)',
                        fontSize: 12, fontWeight: 700,
                      }}>
                        ✓ All complete
                      </span>
                    ) : (
                      <span style={{
                        padding: '6px 12px', borderRadius: 'var(--radius-full)',
                        background: 'var(--surface-2)', color: 'var(--text-2)',
                        fontSize: 12, fontWeight: 700,
                      }}>
                        {progress.pct}% complete
                      </span>
                    )}
                  </div>
                </div>

                {/* Overall progress bar */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>
                      {progress.lessons.completed}/{progress.lessons.total} lessons
                      {progress.assessments.total > 0 && (
                        <> · {progress.assessments.passed}/{progress.assessments.total} assessments passed</>
                      )}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      {progress.pct}%
                    </span>
                  </div>
                  <div style={{ height: 8, background: 'var(--border)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${progress.pct}%`,
                      background: progress.pct === 100 ? 'var(--success)' : 'var(--amber)',
                      borderRadius: 'var(--radius-full)',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>

                {/* Per-module breakdown */}
                {modules.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1rem' }}>
                    {modules.map((mod) => (
                      <div key={mod.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{mod.title}</span>
                          <span style={{ fontSize: 12, color: mod.pct === 100 ? 'var(--success)' : 'var(--text-3)' }}>
                            {mod.pct === 100 ? '✓' : `${mod.pct}%`}
                            {' '}
                            <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>
                              {mod.lessons.completed}/{mod.lessons.total} lessons
                              {mod.assessments.total > 0 && (
                                <> · {mod.assessments.passed}/{mod.assessments.total} assessments</>
                              )}
                            </span>
                          </span>
                        </div>
                        <div style={{ height: 4, background: 'var(--border)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${mod.pct}%`,
                            background: mod.pct === 100 ? 'var(--success)' : 'var(--indigo)',
                            borderRadius: 'var(--radius-full)',
                            transition: 'width 0.3s ease',
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link href={`/courses/${course.slug}`}>
                    <button className="btn btn-outline btn-sm">
                      {progress.pct === 0 ? 'Start course' : progress.pct === 100 ? 'Review course' : 'Continue'}
                    </button>
                  </Link>
                  {certificate?.certificate_url && (
                    <a href={certificate.certificate_url} target="_blank" rel="noopener noreferrer">
                      <button className="btn btn-primary btn-sm">View certificate</button>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
