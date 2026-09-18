/**
 * Normalize a string for comparison: lowercase, strip diacritics, remove punctuation,
 * drop leading articles (the/a/an), collapse whitespace.
 */
export function normalizeForSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Scores the relevance of a manga title against a user search query.
 * Higher score = higher relevance.
 */
export function scoreRelevance(title: string, query: string): number {
  if (!title || !query) return 0

  const t = normalizeForSearch(title)
  const q = normalizeForSearch(query)
  if (!t || !q) return 0

  if (t === q) return 1000
  if (t.startsWith(q + ' ') || t.startsWith(q)) return 800
  if (t.includes(q)) return 500

  const queryTokens = q.split(/\s+/).filter(w => w.length > 1)
  const titleTokens = t.split(/\s+/).filter(w => w.length > 0)
  const titleTokenSet = new Set(titleTokens)

  if (queryTokens.length > 0) {
    let exactMatches = 0
    let substringMatches = 0
    let prefixMatches = 0

    for (const token of queryTokens) {
      if (titleTokenSet.has(token)) {
        exactMatches++
      } else if (t.includes(token)) {
        substringMatches++
      } else {
        for (const tt of titleTokens) {
          if (tt.startsWith(token) || token.startsWith(tt)) {
            prefixMatches++
            break
          }
        }
      }
    }

    const allMatched = exactMatches + substringMatches
    if (allMatched === queryTokens.length) return 400
    if (allMatched > 0) return Math.max(50, (allMatched / queryTokens.length) * 250)
    if (prefixMatches > 0) return Math.max(30, (prefixMatches / queryTokens.length) * 100)
  }

  // Character overlap fallback — better than flat 10
  const qChars = new Set(q.replace(/\s/g, ''))
  const overlap = [...qChars].filter(c => t.includes(c)).length
  return Math.max(10, Math.floor((overlap / Math.max(qChars.size, 1)) * 40))
}

/**
 * Sorts an array of manga results by best relevance score across multiple query variants.
 * Pass a single-element array [query] for standard behavior.
 */
export function sortResultsByRelevance<T extends { title: string }>(results: T[], query: string, variants?: string[]): T[] {
  if (!query || !query.trim()) return results
  const all = variants && variants.length > 0 ? [query, ...variants] : [query]

  return [...results].sort((a, b) => {
    const sA = Math.max(...all.map(v => scoreRelevance(a.title, v)))
    const sB = Math.max(...all.map(v => scoreRelevance(b.title, v)))
    return sB - sA
  })
}
