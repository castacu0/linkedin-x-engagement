import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadEnv, repoRoot } from './lib/env'
import { fetchPostsForAccount } from './lib/sources/index'
import { draftComment } from './lib/draft'
import { saveDay, loadSeen, saveSeen } from './lib/store'
import { notify } from './lib/notify'
import type { AccountConfig, DayFile, Draft, PostRef } from './lib/types'

/** Stable per-post key for cross-run dedup (matches the draft id shape). */
function postKey(account: AccountConfig, postId: string): string {
  return `${account.platform}-${account.handle.replace(/^@/, '')}-${postId}`
}

/** Sample posts may carry a curated example comment so the demo shows the
 *  intended quality without needing an Anthropic key. */
interface SamplePost extends PostRef {
  comment?: string
}
type SamplePosts = Record<string, SamplePost[]>

function loadJson<T>(relPath: string): T {
  return JSON.parse(readFileSync(join(repoRoot, relPath), 'utf8')) as T
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

async function main(): Promise<void> {
  loadEnv()

  const sampleMode = process.argv.includes('--sample') || process.env.SCAN_MODE === 'sample'
  const sinceHours = Number(process.env.SCAN_SINCE_HOURS || '24')
  const sinceIso = new Date(Date.now() - sinceHours * 3600_000).toISOString()

  const accounts = loadJson<AccountConfig[]>('config/accounts.json').filter((a) => a.enabled !== false)
  const samples: SamplePosts = sampleMode ? loadJson<SamplePosts>('config/sample-posts.json') : {}

  // Sample mode is a stateless demo; only live scans track seen posts.
  const seen = sampleMode ? {} : loadSeen()

  console.log(
    `[scan] mode=${sampleMode ? 'sample' : 'live'} accounts=${accounts.length} ` +
      `since=${sinceIso} (${sinceHours}h)`,
  )

  const drafts: Draft[] = []
  const byPlatform: Record<string, number> = {}

  for (const account of accounts) {
    const fetched: SamplePost[] = sampleMode
      ? (samples[account.handle] ?? []).map((p) => ({ ...p, isSample: true }))
      : await fetchPostsForAccount(account, sinceIso)

    // Drop posts already drafted in a previous run (overlapping 72h windows).
    const rawPosts = sampleMode
      ? fetched
      : fetched.filter((p) => !(postKey(account, p.id) in seen))

    const skipped = fetched.length - rawPosts.length
    console.log(
      `[scan] ${account.name} (${account.handle}): ${rawPosts.length} new post(s)` +
        (skipped > 0 ? ` (${skipped} already seen)` : ''),
    )

    for (const raw of rawPosts) {
      const { comment: curated, ...post } = raw
      const { comment, rationale } = curated
        ? { comment: curated, rationale: 'Curated sample (learn-wise example)' }
        : await draftComment(account, post)
      drafts.push({
        id: postKey(account, post.id),
        account: { name: account.name, handle: account.handle, platform: account.platform, url: account.url },
        post,
        draftComment: comment,
        rationale,
        status: 'needs_review',
      })
      byPlatform[account.platform] = (byPlatform[account.platform] ?? 0) + 1
      seen[postKey(account, post.id)] = post.publishedAt || new Date().toISOString()
    }
  }

  const day: DayFile = {
    date: todayUtc(),
    generatedAt: new Date().toISOString(),
    mode: sampleMode ? 'sample' : 'live',
    summary: {
      postsFound: drafts.length,
      draftsReady: drafts.length,
      accountsScanned: accounts.length,
      byPlatform,
    },
    drafts,
  }

  saveDay(day)
  if (!sampleMode) saveSeen(seen)
  console.log(`[scan] wrote public/data/drafts/${day.date}.json and drafts/${day.date}.md`)
  await notify(day)

  if (drafts.length === 0) console.log('[scan] No new posts found. ✅')
}

main().catch((err) => {
  console.error('[scan] fatal:', err)
  process.exit(1)
})
