import { useState, useEffect } from 'react'

export function RawStaticViewer({ path }: { path: string }) {
  const [content, setContent] = useState<string>('Loading...')

  useEffect(() => {
    fetch(path)
      .then((res) => res.text())
      .then((text) => setContent(text))
      .catch(() => setContent('Failed to load ' + path))
  }, [path])

  return (
    <div style={{ margin: 0, padding: '16px', background: '#0a0a0a', color: '#e5e5e5', fontFamily: 'monospace', minHeight: '100vh', width: '100vw' }}>
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>{content}</pre>
    </div>
  )
}
