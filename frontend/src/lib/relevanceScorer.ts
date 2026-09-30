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

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  const curr = new Array<number>(b.length + 1)
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1])
    }
    prev.splice(0, prev.length, ...curr)
  }
  return prev[b.length]
}

// Max edit distance allowed for fuzzy token match, based on token length.
function fuzzyThreshold(len: number): number {
  if (len <= 3) return 0
  if (len <= 5) return 1
  if (len <= 8) return 2
  return 3
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
    let fuzzyMatches = 0

    for (const token of queryTokens) {
      if (titleTokenSet.has(token)) {
        exactMatches++
      } else if (t.includes(token)) {
        substringMatches++
      } else {
        let matched = false
        for (const tt of titleTokens) {
          if (tt.startsWith(token) || token.startsWith(tt)) {
            prefixMatches++
            matched = true
            break
          }
          // Fuzzy: allow small edit distance for longer tokens
          const maxDist = fuzzyThreshold(Math.max(token.length, tt.length))
          if (maxDist > 0 && levenshtein(token, tt) <= maxDist) {
            fuzzyMatches++
            matched = true
            break
          }
        }
        if (!matched) {
          // Partial token overlap (query token is prefix of title word or vice versa)
        }
      }
    }

    const strongMatches = exactMatches + substringMatches
    const allMatched = strongMatches + prefixMatches + fuzzyMatches

    if (strongMatches === queryTokens.length) return 400
    if (strongMatches > 0) return Math.max(50, (strongMatches / queryTokens.length) * 250)
    if (allMatched === queryTokens.length) return 300  // all matched via prefix/fuzzy
    if (allMatched > 0) return Math.max(60, (allMatched / queryTokens.length) * 200)
  }

  // Character overlap fallback
  const qChars = new Set(q.replace(/\s/g, ''))
  const overlap = [...qChars].filter(c => t.includes(c)).length
  return Math.max(10, Math.floor((overlap / Math.max(qChars.size, 1)) * 40))
}

/**
 * Sorts an array of manga results by best relevance score across multiple query variants.
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

/**
 * Filters results to remove noise when good matches exist.
 * If the best result scores >= 200, drops anything scoring < 25.
 * Always keeps at least `minKeep` results so we never show an empty set
 * when results did come back.
 */
export function filterByRelevance<T extends { title: string }>(
  results: T[],
  query: string,
  variants?: string[],
  minKeep = 3,
): T[] {
  if (!query || !query.trim() || results.length === 0) return results
  const all = variants && variants.length > 0 ? [query, ...variants] : [query]

  const scored = results.map(r => ({
    r,
    score: Math.max(...all.map(v => scoreRelevance(r.title, v))),
  }))

  const best = Math.max(...scored.map(s => s.score))
  // Only filter when we have a clearly good match — otherwise show everything
  if (best < 200) return results

  const threshold = 25
  const filtered = scored.filter(s => s.score >= threshold).map(s => s.r)
  return filtered.length >= minKeep ? filtered : results.slice(0, minKeep)
}
