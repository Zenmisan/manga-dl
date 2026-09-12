import { useEffect } from 'react'

const DEFAULT_TITLE = 'manga-dl | Read & Download Manga from 50+ Sources, Free'

export function usePageTitle(title: string | null | undefined) {
  useEffect(() => {
    document.title = title ? `${title} | manga-dl` : DEFAULT_TITLE
    return () => { document.title = DEFAULT_TITLE }
  }, [title])
}
