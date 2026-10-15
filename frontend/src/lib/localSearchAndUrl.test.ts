import { describe, it, expect } from 'bun:test'
import { normalizeApiUrl } from './api'
import { buildSmartMangaUrl, buildSmartReadUrl } from './smartUrl'

describe('normalizeApiUrl', () => {
  it('adds http:// and /api to bare localhost:8000', () => {
    expect(normalizeApiUrl('localhost:8000')).toBe('http://localhost:8000/api')
  })

  it('adds http:// and /api to bare 127.0.0.1:8000', () => {
    expect(normalizeApiUrl('127.0.0.1:8000')).toBe('http://127.0.0.1:8000/api')
  })

  it('handles http://localhost:8000 correctly', () => {
    expect(normalizeApiUrl('http://localhost:8000')).toBe('http://localhost:8000/api')
  })

  it('handles http://localhost:8000/ with trailing slash', () => {
    expect(normalizeApiUrl('http://localhost:8000/')).toBe('http://localhost:8000/api')
  })

  it('preserves existing /api suffix', () => {
    expect(normalizeApiUrl('http://localhost:8000/api')).toBe('http://localhost:8000/api')
  })

  it('handles trailing slash on existing /api/', () => {
    expect(normalizeApiUrl('http://localhost:8000/api/')).toBe('http://localhost:8000/api')
  })

  it('prefixes https:// for external domains without protocol', () => {
    expect(normalizeApiUrl('manga-dl.onrender.com')).toBe('https://manga-dl.onrender.com/api')
  })

  it('preserves https:// domains', () => {
    expect(normalizeApiUrl('https://manga-dl.onrender.com')).toBe('https://manga-dl.onrender.com/api')
    expect(normalizeApiUrl('https://manga-dl.onrender.com/api')).toBe('https://manga-dl.onrender.com/api')
  })

  it('preserves internal relative path starting with /', () => {
    expect(normalizeApiUrl('/api')).toBe('/api')
  })

  it('returns empty string for empty input', () => {
    expect(normalizeApiUrl('')).toBe('')
    expect(normalizeApiUrl('   ')).toBe('')
  })
})

describe('smartUrl local routing', () => {
  it('routes local provider to /local/:id in buildSmartMangaUrl', () => {
    expect(buildSmartMangaUrl('local', 'local-12345', 'Solo Leveling')).toBe('/local/local-12345')
  })

  it('falls back to encoded title if id is empty for local', () => {
    expect(buildSmartMangaUrl('local', '', 'Solo Leveling')).toBe('/local/Solo%20Leveling')
  })

  it('routes local provider to /read/local/:id::chapter in buildSmartReadUrl', () => {
    expect(buildSmartReadUrl('local', 'local-12345', 'ch-1', 'Solo Leveling', 'Chapter 1')).toBe(
      '/read/local/local-12345:ch-1'
    )
  })

  it('still routes remote providers to smart slugs', () => {
    expect(buildSmartMangaUrl('asurascans', '123', 'Solo Leveling')).toBe('/manga/solo-leveling-as')
  })
})
