'use client'

interface ModuleProgress {
  id: string
  title: string
  total: number
  completed: number
  pct: number
}

interface Props {
  modules: ModuleProgress[]
  overall: { total: number; completed: number; pct: number }
  hasCertificate: boolean
}

export default function ModuleProgressBars({ modules, overall, hasCertificate }: Props) {
  if (modules.length === 0) return null

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
      }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Your progress</h3>
        <span style={{
          fontSize: 13,
          fontWeight: 700,
          color: overall.pct === 100 ? 'var(--success)' : 'var(--text-2)',
        }}>
          {overall.pct === 100 ? '🎓 Complete!' : `${overall.pct}%`}
        </span>
      </div>

      {hasCertificate && (
        <div style={{
          padding: '10px 14px',
          background: 'var(--success-bg)',
          border: '1px solid var(--success)',
          borderRadius: 'var(--radius)',
          color: 'var(--success)',
          fontSize: 13,
          fontWeight: 600,
          marginBottom: '1rem',
        }}>
          🏆 Certificate earned — check your progress page
        </div>
      )}

      {/* Overall bar */}
      <div style={{ marginBottom: '1rem' }}>
        <ProgressBar pct={overall.pct} label="Overall" color="var(--amber)" />
      </div>

      {/* Per-module bars */}
      {modules.map((mod) => (
        <div key={mod.id} style={{ marginBottom: 10 }}>
          <ProgressBar
            pct={mod.pct}
            label={mod.title}
            subtitle={`${mod.completed} / ${mod.total} lessons`}
            color="var(--indigo)"
          />
        </div>
      ))}
    </div>
  )
}

function ProgressBar({
  pct,
  label,
  subtitle,
  color,
}: {
  pct: number
  label: string
  subtitle?: string
  color: string
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{label}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {subtitle && (
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{subtitle}</span>
          )}
          <span style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? color : 'var(--text-3)' }}>
            {pct}%
          </span>
        </div>
      </div>
      <div style={{
        height: 6,
        background: 'var(--border)',
        borderRadius: 'var(--radius-full)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: pct === 100 ? 'var(--success)' : color,
          borderRadius: 'var(--radius-full)',
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  )
}
