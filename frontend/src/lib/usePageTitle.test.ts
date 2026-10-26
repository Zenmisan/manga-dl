import { describe, it, expect, beforeEach } from 'bun:test'
import { applyPageMetadata, DEFAULT_TITLE } from './usePageTitle'

class MockMetaElement {
  attributes: Record<string, string> = {}
  setAttribute(name: string, value: string) {
    this.attributes[name] = value
  }
  getAttribute(name: string) {
    return this.attributes[name] ?? null
  }
}

class MockHead {
  elements: MockMetaElement[] = []
  querySelector(selector: string) {
    const nameMatch = selector.match(/meta\[name="([^"]+)"\]/)
    if (nameMatch) {
      return this.elements.find(e => e.attributes['name'] === nameMatch[1]) || null
    }
    const propMatch = selector.match(/meta\[property="([^"]+)"\]/)
    if (propMatch) {
      return this.elements.find(e => e.attributes['property'] === propMatch[1]) || null
    }
    const linkMatch = selector.match(/link\[rel="([^"]+)"\]/)
    if (linkMatch) {
      return this.elements.find(e => e.attributes['rel'] === linkMatch[1]) || null
    }
    return null
  }
  appendChild(el: MockMetaElement) {
    this.elements.push(el)
  }
}

describe('usePageTitle metadata and robots tag handling', () => {
  let mockHead: MockHead

  beforeEach(() => {
    mockHead = new MockHead()
    ;(globalThis as any).document = {
      title: '',
      head: mockHead,
      createElement: () => new MockMetaElement(),
    }
  })

  it('sets standard title, description, and index/follow robots meta', () => {
    applyPageMetadata('Solo Leveling', {
      description: 'Read Solo Leveling manhwa free online.',
      url: 'https://manga-dl.web.app/manga/solo-leveling',
    })

    expect((globalThis as any).document.title).toBe('Solo Leveling | manga-dl')
    const robotsMeta = mockHead.querySelector('meta[name="robots"]')
    expect(robotsMeta).not.toBeNull()
    expect(robotsMeta?.getAttribute('content')).toContain('index, follow')
  })

  it('sets noindex, nofollow on error and missing resource pages to prevent soft 404 penalties', () => {
    applyPageMetadata('Manga Not Found', {
      noindex: true,
      url: 'https://manga-dl.web.app/manga/invalid-id',
    })

    expect((globalThis as any).document.title).toBe('Manga Not Found | manga-dl')
    const robotsMeta = mockHead.querySelector('meta[name="robots"]')
    expect(robotsMeta).not.toBeNull()
    expect(robotsMeta?.getAttribute('content')).toBe('noindex, nofollow')
  })

  it('restores default title and indexable meta when title is nullified', () => {
    applyPageMetadata(null)

    expect((globalThis as any).document.title).toBe(DEFAULT_TITLE)
    const robotsMeta = mockHead.querySelector('meta[name="robots"]')
    expect(robotsMeta).not.toBeNull()
    expect(robotsMeta?.getAttribute('content')).toContain('index, follow')
  })
})
