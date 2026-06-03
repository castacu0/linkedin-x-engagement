import { useState } from 'react'

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button className={`btn ${copied ? 'active' : ''}`} onClick={copy} type="button">
      {copied ? '✓ Copied' : 'Copy comment'}
    </button>
  )
}
