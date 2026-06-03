import type { AccountConfig, PostRef } from '../types'

/** Decode the handful of XML entities that show up in RSS text. */
function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'))
  return m ? decode(m[1]) : ''
}

/**
 * Best-effort RSS/Atom reader — the practical fallback for LinkedIn (and X)
 * when you point an account's `rssUrl` at an RSS-bridge feed. Deliberately
 * dependency-free and tolerant rather than a full spec-compliant parser.
 */
export async function fetchRssPosts(account: AccountConfig, sinceIso: string): Promise<PostRef[]> {
  if (!account.rssUrl) return []
  const res = await fetch(account.rssUrl)
  if (!res.ok) {
    console.error(`[rss] fetch failed for ${account.name}: ${res.status} ${res.statusText}`)
    return []
  }
  const xml = await res.text()
  const since = Date.parse(sinceIso)

  const blocks = [
    ...xml.matchAll(/<item[\s\S]*?<\/item>/gi),
    ...xml.matchAll(/<entry[\s\S]*?<\/entry>/gi),
  ].map((m) => m[0])

  const posts: PostRef[] = []
  for (const block of blocks) {
    const link =
      tag(block, 'link') ||
      (block.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? '')
    const text = tag(block, 'description') || tag(block, 'title') || tag(block, 'summary')
    const dateStr = tag(block, 'pubDate') || tag(block, 'updated') || tag(block, 'published')
    const ts = dateStr ? Date.parse(dateStr) : Date.now()
    if (!Number.isNaN(ts) && ts < since) continue
    posts.push({
      id: link || `${account.handle}-${ts}`,
      url: link || account.url,
      publishedAt: Number.isNaN(ts) ? new Date().toISOString() : new Date(ts).toISOString(),
      text,
    })
  }
  return posts
}
