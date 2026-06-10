import { mkdirSync, writeFileSync, readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { repoRoot } from './env'
import type { DayFile, IndexFile } from './types'

const dataDir = join(repoRoot, 'public', 'data')
const draftsDir = join(dataDir, 'drafts')
const markdownDir = join(repoRoot, 'drafts')
const seenPath = join(dataDir, 'seen.json')

/** Map of post key → ISO date last seen. Lets overlapping scan windows (the
 *  Mon/Wed/Fri schedule looks back 72h) avoid drafting the same post twice. */
export type SeenMap = Record<string, string>

const SEEN_TTL_MS = 45 * 24 * 3600_000

export function loadSeen(): SeenMap {
  if (!existsSync(seenPath)) return {}
  try {
    return JSON.parse(readFileSync(seenPath, 'utf8')) as SeenMap
  } catch {
    return {}
  }
}

/** Persist the seen map, pruning entries older than the TTL so it stays small. */
export function saveSeen(seen: SeenMap): void {
  const cutoff = Date.now() - SEEN_TTL_MS
  const pruned: SeenMap = {}
  for (const [key, iso] of Object.entries(seen)) {
    const ts = Date.parse(iso)
    if (Number.isNaN(ts) || ts >= cutoff) pruned[key] = iso
  }
  mkdirSync(dataDir, { recursive: true })
  writeFileSync(seenPath, JSON.stringify(pruned, null, 2) + '\n')
}

/** Persist a day's drafts as JSON (for the app) + Markdown (for GitHub review),
 *  then refresh the index the dashboard reads. */
export function saveDay(day: DayFile): void {
  mkdirSync(draftsDir, { recursive: true })
  mkdirSync(markdownDir, { recursive: true })

  writeFileSync(join(draftsDir, `${day.date}.json`), JSON.stringify(day, null, 2) + '\n')
  writeFileSync(join(markdownDir, `${day.date}.md`), renderMarkdown(day))
  writeIndex()
}

function writeIndex(): void {
  const days = readdirSync(draftsDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort()
    .reverse()
  const index: IndexFile = { generatedAt: new Date().toISOString(), days }
  writeFileSync(join(dataDir, 'index.json'), JSON.stringify(index, null, 2) + '\n')
}

function renderMarkdown(day: DayFile): string {
  const lines: string[] = []
  lines.push(`# Engagement drafts — ${day.date}`)
  lines.push('')
  lines.push(
    `> Generated ${day.generatedAt} · mode: **${day.mode}** · ` +
      `${day.summary.postsFound} post(s) found · ${day.summary.draftsReady} draft(s) ready · ` +
      `**draft-only, review before posting**`,
  )
  lines.push('')
  if (day.drafts.length === 0) {
    lines.push('_No new posts found in the scan window._')
    lines.push('')
    return lines.join('\n')
  }
  for (const d of day.drafts) {
    const sample = d.post.isSample ? ' _(sample)_' : ''
    lines.push(`## ${d.account.name} · ${d.account.handle} · ${d.account.platform.toUpperCase()}${sample}`)
    lines.push('')
    lines.push(`- **Post:** ${d.post.text}`)
    lines.push(`- **Link:** ${d.post.url}`)
    lines.push(`- **Published:** ${d.post.publishedAt}`)
    lines.push(`- **Status:** ${d.status}`)
    lines.push('')
    lines.push('**Proposed comment:**')
    lines.push('')
    lines.push('> ' + d.draftComment.replace(/\n/g, '\n> '))
    lines.push('')
    lines.push(`<sub>${d.rationale}</sub>`)
    lines.push('')
    lines.push('---')
    lines.push('')
  }
  return lines.join('\n')
}
