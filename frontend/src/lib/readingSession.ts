const SESSIONS_KEY = 'manga-dl-reading-sessions'
const MAX_SESSIONS = 500

interface ReadingSession {
  id: string
  startedAt: string
  endedAt: string
  durationSecs: number
  pagesRead: number
  provider: string
  mangaId: string
  chapterId: string
  mangaTitle: string
}

function load(): ReadingSession[] {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]') } catch { return [] }
}

function save(sessions: ReadingSession[]) {
  try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(-MAX_SESSIONS))) } catch { /* quota */ }
}

export function startSession(provider: string, mangaId: string, chapterId: string, mangaTitle: string): string {
  return JSON.stringify({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, startedAt: new Date().toISOString(), provider, mangaId, chapterId, mangaTitle })
}

export function endSession(sessionToken: string, pagesRead: number): void {
  if (!sessionToken) return
  try {
    const partial = JSON.parse(sessionToken) as { id: string; startedAt: string; provider: string; mangaId: string; chapterId: string; mangaTitle: string }
    const endedAt = new Date().toISOString()
    const durationSecs = Math.round((Date.now() - new Date(partial.startedAt).getTime()) / 1000)
    if (durationSecs < 10 || pagesRead < 1) return
    const session: ReadingSession = { ...partial, endedAt, durationSecs, pagesRead }
    const sessions = load()
    sessions.push(session)
    save(sessions)
  } catch { /* malformed token */ }
}

export function getSessions(): ReadingSession[] {
  return load()
}

export function getTodayReadingSecs(): number {
  const today = new Date().toISOString().split('T')[0]
  return load().filter(s => s.startedAt.startsWith(today)).reduce((sum, s) => sum + s.durationSecs, 0)
}

export function getWeekReadingSecs(): number {
  const cutoff = Date.now() - 7 * 86_400_000
  return load().filter(s => new Date(s.startedAt).getTime() >= cutoff).reduce((sum, s) => sum + s.durationSecs, 0)
}

export function getAvgSessionSecs(): number {
  const sessions = load()
  if (!sessions.length) return 0
  return Math.round(sessions.reduce((sum, s) => sum + s.durationSecs, 0) / sessions.length)
}

export function getReadingSpeedPagesPerMin(): number {
  const sessions = load().filter(s => s.durationSecs >= 30 && s.pagesRead >= 2)
  if (!sessions.length) return 0
  const totalPages = sessions.reduce((sum, s) => sum + s.pagesRead, 0)
  const totalMins = sessions.reduce((sum, s) => sum + s.durationSecs / 60, 0)
  return Math.round(totalPages / totalMins)
}
