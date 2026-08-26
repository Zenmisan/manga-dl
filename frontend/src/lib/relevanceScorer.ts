/**
 * Scores the relevance of a manga title against a user search query.
 * Higher score = higher relevance.
 */
export function scoreRelevance(title: string, query: string): number {
  if (!title || !query) return 0

  const t = title.toLowerCase().trim()
  const q = query.toLowerCase().trim()

  // Exact full title match (e.g. "Solo Leveling" === "Solo Leveling")
  if (t === q) return 1000

  // Title starts with the query (e.g. "Solo Leveling: Ragnarok" starts with "Solo Leveling")
  if (t.startsWith(q)) return 800

  // Title contains the full exact query string (e.g. "The Legend of Solo Leveling")
  if (t.includes(q)) return 500

  // Word token matching: count how many query words are in the title
  const queryTokens = q.split(/\s+/).filter(w => w.length > 1)
  if (queryTokens.length > 0) {
    let matchedWords = 0
    for (const token of queryTokens) {
      if (t.includes(token)) matchedWords++
    }

    if (matchedWords === queryTokens.length) {
      // Contains all words in any order
      return 400
    }

    if (matchedWords > 0) {
      // Partial word matches (e.g. matched 1 out of 2 words)
      return (matchedWords / queryTokens.length) * 250
    }
  }

  // Fallback fuzzy / character overlap
  return 10
}

/**
 * Sorts an array of manga results by their relevance score against the query in descending order.
 */
export function sortResultsByRelevance<T extends { title: string }>(results: T[], query: string): T[] {
  if (!query || !query.trim()) return results

  return [...results].sort((a, b) => {
    const scoreA = scoreRelevance(a.title, query)
    const scoreB = scoreRelevance(b.title, query)
    return scoreB - scoreA
  })
}
