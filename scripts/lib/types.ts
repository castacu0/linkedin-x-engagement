export type Platform = 'x' | 'linkedin'

/** A monitored account, as configured in config/accounts.json. */
export interface AccountConfig {
  name: string
  /** @handle for X, or the org slug for LinkedIn. */
  handle: string
  platform: Platform
  url: string
  enabled?: boolean
  /** LinkedIn only: urn:li:organization:<id> for the Community Management API. */
  orgUrn?: string
  /** Optional RSS-bridge feed URL (most practical LinkedIn/X fallback). */
  rssUrl?: string
  note?: string
}

/** The lightweight account descriptor stored alongside each draft. */
export interface Account {
  name: string
  handle: string
  platform: Platform
  url: string
}

/** A single post discovered from a source. */
export interface PostRef {
  id: string
  url: string
  publishedAt: string
  text: string
  /** True when this came from sample data rather than a live API. */
  isSample?: boolean
}

export type DraftStatus = 'needs_review' | 'approved' | 'posted' | 'skipped'

/** A post paired with its proposed comment — the unit a human reviews. */
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

/** One JSON file per day under public/data/drafts/<date>.json. */
export interface DayFile {
  date: string
  generatedAt: string
  mode: 'live' | 'sample'
  summary: DaySummary
  drafts: Draft[]
}

/** Index of available days, at public/data/index.json. */
export interface IndexFile {
  generatedAt: string
  days: string[]
}
