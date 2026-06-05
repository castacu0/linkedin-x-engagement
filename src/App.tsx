import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { DayFile, IndexFile, Platform } from './types'
import PostCard from './components/PostCard'

const BASE = import.meta.env.BASE_URL // honors vite `base`

type Filter = 'all' | Platform

export default function App() {
  const [index, setIndex] = useState<IndexFile | null>(null)
  const [day, setDay] = useState<DayFile | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [error, setError] = useState<string | null>(null)

  // Load the index once, then default to the most recent day.
  useEffect(() => {
    fetch(`${BASE}data/index.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`index ${r.status}`))))
      .then((idx: IndexFile) => {
        setIndex(idx)
        if (idx.days.length > 0) setSelectedDate(idx.days[0])
        else setError('No scans yet. Run `npm run scan:sample` to generate drafts.')
      })
      .catch(() => setError('Could not load data/index.json. Run a scan first.'))
  }, [])

  // Load the selected day's drafts.
  useEffect(() => {
    if (!selectedDate) return
    fetch(`${BASE}data/drafts/${selectedDate}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`day ${r.status}`))))
      .then((d: DayFile) => setDay(d))
      .catch(() => setError(`Could not load drafts for ${selectedDate}.`))
  }, [selectedDate])

  const visibleDrafts = useMemo(() => {
    if (!day) return []
    return filter === 'all' ? day.drafts : day.drafts.filter((d) => d.account.platform === filter)
  }, [day, filter])

  return (
    <div className="wrap">
      <header className="masthead">
        <h1>YC Engagement Desk</h1>
        <p>Daily scan of Y Combinator + selected builders on X &amp; LinkedIn — draft comments, reviewed by you.</p>
        <div className="pills">
          <span className="pill safe">Draft-only</span>
          <span className="pill">Learn-wise tone</span>
          {day && <span className="pill">{day.mode === 'sample' ? 'Sample data' : 'Live'}</span>}
          {day && <span className="pill">{day.date}</span>}
        </div>
      </header>

      {error && !day && <div className="empty">{error}</div>}

      {day && (
        <>
          <section className="stats">
            <div className="stat s-blue">
              <div className="num">{day.summary.postsFound}</div>
              <div className="label">Posts found</div>
            </div>
            <div className="stat s-pink">
              <div className="num">{day.summary.draftsReady}</div>
              <div className="label">Drafts ready</div>
            </div>
            <div className="stat">
              <div className="num">{day.summary.accountsScanned}</div>
              <div className="label">Accounts scanned</div>
            </div>
          </section>

          <section className="controls">
            <FilterButton current={filter} value="all" onClick={setFilter}>All</FilterButton>
            <FilterButton current={filter} value="x" onClick={setFilter}>X</FilterButton>
            <FilterButton current={filter} value="linkedin" onClick={setFilter}>LinkedIn</FilterButton>
            <span className="spacer" />
            {index && index.days.length > 1 && (
              <select
                className="btn"
                value={selectedDate ?? ''}
                onChange={(e) => setSelectedDate(e.target.value)}
              >
                {index.days.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            )}
          </section>

          {visibleDrafts.length === 0 ? (
            <div className="empty">✅ No new posts to review in this view.</div>
          ) : (
            visibleDrafts.map((d) => <PostCard key={d.id} draft={d} />)
          )}
        </>
      )}

      <p className="foot-note">
        Comments are drafts for your review — nothing is posted automatically.
      </p>
    </div>
  )
}

function FilterButton({
  current,
  value,
  onClick,
  children,
}: {
  current: Filter
  value: Filter
  onClick: (f: Filter) => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={`btn ${current === value ? 'active' : ''}`}
      onClick={() => onClick(value)}
    >
      {children}
    </button>
  )
}
