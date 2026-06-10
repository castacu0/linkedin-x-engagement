import type { AccountConfig, PostRef } from '../types'
import { fetchRssPosts } from './rss'

const API = 'https://api.x.com/2'

/**
 * Fetch recent original posts (no retweets/replies) for one X account since
 * `sinceIso`.
 *
 * Resolution order:
 *   1. `rssUrl` — an RSS-bridge feed of the profile (no key). Used only if set.
 *   2. X API v2 app-only Bearer token (`X_BEARER_TOKEN`). As of Feb 2026 the
 *      default is pay-per-use (prepaid credits, no subscription) — reading other
 *      users' posts is billed per read, a few dollars/month at this volume.
 * Without either, the account is skipped (returns []).
 */
export async function fetchXPosts(account: AccountConfig, sinceIso: string): Promise<PostRef[]> {
  if (account.rssUrl) return fetchRssPosts(account, sinceIso)

  const token = process.env.X_BEARER_TOKEN
  if (!token) {
    console.warn(`[x] ${account.handle}: no rssUrl and X_BEARER_TOKEN unset — skipping. See SETUP_KEYS.md.`)
    return []
  }

  const username = account.handle.replace(/^@/, '')
  const headers = { Authorization: `Bearer ${token}` }

  const userRes = await fetch(`${API}/users/by/username/${encodeURIComponent(username)}`, { headers })
  if (!userRes.ok) {
    console.error(`[x] user lookup failed for @${username}: ${userRes.status} ${userRes.statusText}`)
    return []
  }
  const userId = ((await userRes.json()) as { data?: { id?: string } })?.data?.id
  if (!userId) {
    console.error(`[x] no user id resolved for @${username}`)
    return []
  }

  const params = new URLSearchParams({
    max_results: '10',
    'tweet.fields': 'created_at,text',
    exclude: 'retweets,replies',
    start_time: sinceIso,
  })
  const res = await fetch(`${API}/users/${userId}/tweets?${params.toString()}`, { headers })
  if (!res.ok) {
    console.error(`[x] tweets fetch failed for @${username}: ${res.status} ${res.statusText}`)
    return []
  }

  const json = (await res.json()) as { data?: Array<{ id: string; text: string; created_at?: string }> }
  return (json.data ?? []).map((t) => ({
    id: t.id,
    url: `https://x.com/${username}/status/${t.id}`,
    publishedAt: t.created_at ?? new Date().toISOString(),
    text: t.text,
  }))
}
