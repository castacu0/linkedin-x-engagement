import type { Account, PostRef } from './types'

const SYSTEM_PROMPT = `You draft short comments to leave on social media posts from founders, investors, and builders (e.g. Y Combinator, Garry Tan, Andrej Karpathy).

Voice: "learn-wise" — a curious, grounded builder who genuinely took something away from the post.

Rules:
- Acknowledge ONE specific, concrete idea from the post. Never generic.
- Express real learning or inspiration, not flattery. No "amazing", "incredible", "you're a genius", no sycophancy.
- 1–3 sentences. Sound like a person, not a brand.
- At most one emoji, and only if it fits naturally.
- No hashtags, no @-spam, no links, no "great post!".
- It's fine to mention what you'll try or rethink because of it.
Return ONLY the comment text, nothing else.`

interface DraftResult {
  comment: string
  rationale: string
}

/** Draft a comment for a post — via Claude if a key is present, else template. */
export async function draftComment(account: Account, post: PostRef): Promise<DraftResult> {
  const key = process.env.ANTHROPIC_API_KEY
  if (key) {
    try {
      return await draftWithClaude(key, account, post)
    } catch (err) {
      console.error('[draft] Claude call failed, falling back to template:', (err as Error).message)
    }
  }
  return templateDraft(account, post)
}

async function draftWithClaude(key: string, account: Account, post: PostRef): Promise<DraftResult> {
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'
  const userPrompt =
    `Post by ${account.name} (${account.handle}) on ${account.platform.toUpperCase()}:\n\n` +
    `"""${post.text}"""\n\nWrite the comment.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic API ${res.status} ${res.statusText}`)
  const json = (await res.json()) as { content?: Array<{ type: string; text?: string }> }
  const text = (json.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('')
    .trim()
  if (!text) throw new Error('empty completion')
  return { comment: text, rationale: `Drafted by ${model}` }
}

/**
 * Dependency-free fallback writer. Picks a sentence from the post to anchor on
 * and slots it into a rotating set of learn-wise frames so output isn't
 * identical across posts. Lower quality than Claude — set ANTHROPIC_API_KEY.
 */
function templateDraft(account: Account, post: PostRef): DraftResult {
  const anchor = firstClause(post.text)
  const frames = [
    (a: string) => `The point about ${a} is the part I'm sitting with — going to put it into practice this week. 🙏`,
    (a: string) => `What stuck with me here is ${a}. A useful nudge to rethink how I'm approaching it.`,
    (a: string) => `${capitalize(a)} reframed this for me a bit — saving it as a gut-check for my own work. 👏`,
    (a: string) => `Took something real from this: ${a}. The kind of idea I'll be chewing on for a while.`,
  ]
  const idx = hash(post.id || post.text) % frames.length
  return {
    comment: frames[idx](anchor),
    rationale: 'Template fallback (no ANTHROPIC_API_KEY set)',
  }
}

function firstClause(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  const sentence = clean.split(/(?<=[.!?])\s/)[0] ?? clean
  let s = sentence.replace(/[.!?]+$/, '').trim()
  if (s.length > 120) s = s.slice(0, 117).trimEnd() + '…'
  return s.charAt(0).toLowerCase() + s.slice(1)
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}
