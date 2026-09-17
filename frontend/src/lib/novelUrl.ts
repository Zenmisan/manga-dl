export function buildNovelReadUrl(
  provider: string,
  novelId: string,
  chapterId: string,
  novelTitle?: string,
  chapterTitle?: string,
): string {
  const params = new URLSearchParams()
  if (novelTitle) params.set('title', novelTitle)
  if (chapterTitle) params.set('ch', chapterTitle)
  const query = params.toString()
  return `/read/novel/${provider}/${encodeURIComponent(novelId)}/${encodeURIComponent(chapterId)}${query ? '?' + query : ''}`
}
