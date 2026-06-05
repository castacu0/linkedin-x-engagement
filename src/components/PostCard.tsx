import type { Draft } from '../types'
import CopyButton from './CopyButton'

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function PostCard({ draft }: { draft: Draft }) {
  const { account, post, draftComment, rationale } = draft
  return (
    <article className="card">
      <div className="card-head">
        <span className={`badge ${account.platform}`}>
          {account.platform === 'x' ? 'X' : 'LinkedIn'}
        </span>
        <strong>{account.name}</strong>
        <span className="handle">{account.handle}</span>
        {post.isSample && <span className="badge sample">Sample</span>}
        <span className="spacer" />
        <span className="date">{formatDate(post.publishedAt)}</span>
      </div>

      <p className="post-text">{post.text}</p>

      <div className="draft-label">Proposed comment · learn-wise</div>
      <div className="draft-box">{draftComment}</div>

      <div className="card-foot">
        <CopyButton text={draftComment} />
        <a className="btn" href={post.url} target="_blank" rel="noreferrer">
          View post ↗
        </a>
        <span className="spacer" />
        <span className="rationale">{rationale}</span>
      </div>
    </article>
  )
}
