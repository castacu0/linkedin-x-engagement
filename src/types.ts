// Mirrors the JSON shape written by scripts/lib/store.ts.
export type Platform = 'x' | 'linkedin'

export interface Account {
  name: string
  handle: string
  platform: Platform
  url: string
}

export interface PostRef {
  id: string
  url: string
  publishedAt: string
  text: string
  isSample?: boolean
}

export type DraftStatus = 'needs_review' | 'approved' | 'posted' | 'skipped'

export interface Draft {
  id: string
  account: Account
  post: PostRef
  draftComment: string
  rationale: string
  status: DraftStatus
}

export interface DaySummary {
  postsFound: number
  draftsReady: number
  accountsScanned: number
  byPlatform: Record<string, number>
}

export interface DayFile {
  date: string
  generatedAt: string
  mode: 'live' | 'sample'
  summary: DaySummary
  drafts: Draft[]
}

export interface IndexFile {
  generatedAt: string
  days: string[]
}
