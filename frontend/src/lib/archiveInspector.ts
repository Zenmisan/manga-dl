import JSZip from 'jszip'

export interface ParsedLocalChapter {
  id: string
  chapterNumber: number
  title: string
  imageFileNames: string[]
  filePath?: string
}

export interface ParsedArchive {
  seriesTitle: string
  isMultiChapter: boolean
  rangeStart?: number
  rangeEnd?: number
  chapters: ParsedLocalChapter[]
  coverBlob?: Blob
  type?: 'manga' | 'novel'
}

const VALID_IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.avif']

/**
 * Normalizes a zip entry relative path (handles ../ and ./)
 */
export function normalizeZipPath(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/')
  const stack: string[] = []
  for (const part of parts) {
    if (!part || part === '.') continue
    if (part === '..') {
      if (stack.length > 0) stack.pop()
    } else {
      stack.push(part)
    }
  }
  return stack.join('/')
}

/**
 * Natural sort comparator for alphanumeric strings (e.g. 'Chapter 2' before 'Chapter 10')
 */
export function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

/**
 * Extract series title, chapter number, and range from archive name
 * e.g. "Solo_Leveling_01-10.zip" -> { seriesTitle: "Solo Leveling", rangeStart: 1, rangeEnd: 10 }
 * e.g. "One_Piece_Chapter_1080.cbz" -> { seriesTitle: "One Piece", rangeStart: 1080, rangeEnd: 1080 }
 */
export function parseArchiveFilename(filename: string) {
  const clean = filename.replace(/\.(cbz|zip|epub|cbr)$/i, '')

  // Range detection: e.g. "01-10", "11-20", "ch01-ch10", "c1-c10"
  const rangeMatch = clean.match(/(?:ch(?:apter)?\.?\s*|c)?(\d+)\s*[-–_to]+\s*(?:ch(?:apter)?\.?\s*|c)?(\d+)/i)
  let rangeStart: number | undefined
  let rangeEnd: number | undefined

  if (rangeMatch) {
    rangeStart = parseInt(rangeMatch[1], 10)
    rangeEnd = parseInt(rangeMatch[2], 10)
    if (rangeStart > rangeEnd) {
      const temp = rangeStart
      rangeStart = rangeEnd
      rangeEnd = temp
    }
  }

  // Single chapter detection: e.g. "Chapter 105", "Ch.105", "c105", "v01_ch05"
  const singleChMatch = clean.match(/(?:ch(?:apter)?\.?\s*|c)(\d+(?:\.\d+)?)/i) ||
                        clean.match(/(?:^|[^\d])(\d+(?:\.\d+)?)(?:$|[^\d])/i)

  const singleCh = singleChMatch ? parseFloat(singleChMatch[1]) : undefined

  // Series title extraction
  let seriesTitle = clean
  if (rangeMatch && rangeMatch.index !== undefined && rangeMatch.index > 0) {
    seriesTitle = clean.substring(0, rangeMatch.index)
  } else if (singleChMatch && singleChMatch.index !== undefined && singleChMatch.index > 0) {
    seriesTitle = clean.substring(0, singleChMatch.index)
  }

  seriesTitle = seriesTitle
    .replace(/[\[\(][^\]\)]*[\]\)]/g, ' ') // Strip [Group] or (v01) tags
    .replace(/[-_.]+/g, ' ')
    .trim()

  return {
    seriesTitle: seriesTitle || clean,
    rangeStart: rangeStart ?? singleCh,
    rangeEnd: rangeEnd ?? singleCh,
    isRange: !!rangeMatch
  }
}

/**
 * Parses chapter number from folder or file name
 * e.g. "Chapter 1", "Ch. 02", "10", "c05.5" -> 1, 2, 10, 5.5
 */
export function extractChapterNumber(name: string, fallbackIndex = 1): number {
  const match = name.match(/(?:ch(?:apter)?\.?\s*|c)?(\d+(?:\.\d+)?)/i)
  if (match) {
    const parsed = parseFloat(match[1])
    if (!isNaN(parsed)) return parsed
  }
  return fallbackIndex
}

/**
 * Inspect an EPUB package and extract chapters (novel or manga).
 */
export async function inspectEpubArchive(
  zip: JSZip,
  originalFilename: string,
  meta: ReturnType<typeof parseArchiveFilename>
): Promise<ParsedArchive> {
  // 1. Find OPF package document
  let opfPath = ''
  const containerEntry = zip.files['META-INF/container.xml'] || zip.files['meta-inf/container.xml']
  if (containerEntry) {
    try {
      const containerXml = await containerEntry.async('text')
      const match = containerXml.match(/full-path\s*=\s*["']([^"']+)["']/i)
      if (match) opfPath = match[1].trim()
    } catch { /* non-fatal */ }
  }
  if (!opfPath) {
    opfPath = Object.keys(zip.files).find(p => p.toLowerCase().endsWith('.opf')) || ''
  }

  let rawBookTitle = ''
  let rawCreator = ''
  let coverHref = ''
  let navHref = ''
  let ncxHref = ''
  const manifest = new Map<string, { href: string; mediaType: string; properties: string }>()
  const spineItems: { id: string; href: string; mediaType: string }[] = []

  if (opfPath && zip.files[opfPath]) {
    try {
      const opfText = await zip.files[opfPath].async('text')
      const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : ''

      if (typeof DOMParser !== 'undefined') {
        const parser = new DOMParser()
        const opfDoc = parser.parseFromString(opfText, 'application/xml')

        const titleEl = opfDoc.getElementsByTagName('dc:title')[0] || opfDoc.getElementsByTagName('title')[0]
        const creatorEl = opfDoc.getElementsByTagName('dc:creator')[0] || opfDoc.getElementsByTagName('creator')[0]
        rawBookTitle = titleEl?.textContent?.trim() || ''
        rawCreator = creatorEl?.textContent?.trim() || ''

        const itemEls = Array.from(opfDoc.getElementsByTagName('item'))
        for (const item of itemEls) {
          const id = item.getAttribute('id') || ''
          const href = item.getAttribute('href') || ''
          const mediaType = item.getAttribute('media-type') || ''
          const properties = item.getAttribute('properties') || ''
          if (id && href) {
            const fullHref = normalizeZipPath(opfDir + href)
            manifest.set(id, { href: fullHref, mediaType, properties })
            if (properties.includes('cover-image') || id.toLowerCase().includes('cover') || href.toLowerCase().includes('cover')) {
              if (!coverHref || properties.includes('cover-image')) {
                coverHref = fullHref
              }
            }
            if (properties.includes('nav')) {
              navHref = fullHref
            }
            if (mediaType.includes('x-dtbncx+xml') || href.toLowerCase().endsWith('.ncx')) {
              ncxHref = fullHref
            }
          }
        }

        const itemRefEls = Array.from(opfDoc.getElementsByTagName('itemref'))
        for (const ref of itemRefEls) {
          const idref = ref.getAttribute('idref') || ''
          const item = manifest.get(idref)
          if (item && item.href) {
            spineItems.push({ id: idref, href: item.href, mediaType: item.mediaType })
          }
        }
      } else {
        const titleMatch = opfText.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i) || opfText.match(/<title[^>]*>([^<]+)<\/title>/i)
        const creatorMatch = opfText.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i) || opfText.match(/<creator[^>]*>([^<]+)<\/creator>/i)
        if (titleMatch) rawBookTitle = titleMatch[1].trim()
        if (creatorMatch) rawCreator = creatorMatch[1].trim()

        const itemRegex = /<item\s+([^>]+)\/?>/gi
        let m: RegExpExecArray | null
        while ((m = itemRegex.exec(opfText)) !== null) {
          const attrs = m[1]
          const id = attrs.match(/id\s*=\s*["']([^"']+)["']/i)?.[1] || ''
          const href = attrs.match(/href\s*=\s*["']([^"']+)["']/i)?.[1] || ''
          const mediaType = attrs.match(/media-type\s*=\s*["']([^"']+)["']/i)?.[1] || ''
          const properties = attrs.match(/properties\s*=\s*["']([^"']+)["']/i)?.[1] || ''
          if (id && href) {
            const fullHref = normalizeZipPath(opfDir + href)
            manifest.set(id, { href: fullHref, mediaType, properties })
            if (properties.includes('cover-image') || id.toLowerCase().includes('cover') || href.toLowerCase().includes('cover')) {
              if (!coverHref || properties.includes('cover-image')) {
                coverHref = fullHref
              }
            }
            if (properties.includes('nav')) {
              navHref = fullHref
            }
            if (mediaType.includes('x-dtbncx+xml') || href.toLowerCase().endsWith('.ncx')) {
              ncxHref = fullHref
            }
          }
        }

        const itemRefRegex = /<itemref\s+([^>]+)\/?>/gi
        while ((m = itemRefRegex.exec(opfText)) !== null) {
          const idref = m[1].match(/idref\s*=\s*["']([^"']+)["']/i)?.[1] || ''
          const item = manifest.get(idref)
          if (item && item.href) {
            spineItems.push({ id: idref, href: item.href, mediaType: item.mediaType })
          }
        }
      }
    } catch { /* fallback to flat enumeration */ }
  }

  // Fallback to all xhtml / html files if no spine found
  if (spineItems.length === 0) {
    const xhtmlEntries = Object.keys(zip.files)
      .filter(k => !zip.files[k].dir && (k.toLowerCase().endsWith('.xhtml') || k.toLowerCase().endsWith('.html')))
      .sort(naturalSort)
    for (const k of xhtmlEntries) {
      spineItems.push({ id: k, href: k, mediaType: 'application/xhtml+xml' })
    }
  }

  // Parse Table of Contents labels (EPUB 3 nav or EPUB 2 ncx)
  const tocMap = new Map<string, string>()
  if (navHref && zip.files[navHref]) {
    try {
      const navText = await zip.files[navHref].async('text')
      const navDir = navHref.includes('/') ? navHref.substring(0, navHref.lastIndexOf('/') + 1) : ''
      if (typeof DOMParser !== 'undefined') {
        const navDoc = new DOMParser().parseFromString(navText, 'text/html')
        navDoc.querySelectorAll('a').forEach(a => {
          const href = a.getAttribute('href')
          const title = a.textContent?.trim()
          if (href && title) {
            const cleanHref = href.split('#')[0]
            const resolved = normalizeZipPath(navDir + cleanHref)
            tocMap.set(resolved, title)
          }
        })
      } else {
        const aRegex = /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
        let m: RegExpExecArray | null
        while ((m = aRegex.exec(navText)) !== null) {
          const href = m[1].split('#')[0]
          const title = m[2].replace(/<[^>]+>/g, '').trim()
          if (href && title) {
            tocMap.set(normalizeZipPath(navDir + href), title)
          }
        }
      }
    } catch { /* non-fatal */ }
  }

  if (tocMap.size === 0 && ncxHref && zip.files[ncxHref]) {
    try {
      const ncxText = await zip.files[ncxHref].async('text')
      const ncxDir = ncxHref.includes('/') ? ncxHref.substring(0, ncxHref.lastIndexOf('/') + 1) : ''
      if (typeof DOMParser !== 'undefined') {
        const ncxDoc = new DOMParser().parseFromString(ncxText, 'application/xml')
        const navPoints = Array.from(ncxDoc.getElementsByTagName('navPoint'))
        for (const np of navPoints) {
          const labelEl = np.getElementsByTagName('text')[0]
          const contentEl = np.getElementsByTagName('content')[0]
          const label = labelEl?.textContent?.trim()
          const src = contentEl?.getAttribute('src')
          if (label && src) {
            const cleanSrc = src.split('#')[0]
            const resolved = normalizeZipPath(ncxDir + cleanSrc)
            tocMap.set(resolved, label)
          }
        }
      } else {
        const npRegex = /<navPoint[\s\S]*?<text>([^<]+)<\/text>[\s\S]*?src\s*=\s*["']([^"']+)["'][\s\S]*?<\/navPoint>/gi
        let m: RegExpExecArray | null
        while ((m = npRegex.exec(ncxText)) !== null) {
          const label = m[1].trim()
          const src = m[2].split('#')[0]
          if (label && src) {
            tocMap.set(normalizeZipPath(ncxDir + src), label)
          }
        }
      }
    } catch { /* non-fatal */ }
  }

  // Check whether content is text novel or manga image spine
  let isNovel = false
  let sampleCount = 0
  for (const item of spineItems) {
    if (item.href === navHref) continue
    const file = zip.files[item.href]
    if (file) {
      try {
        const text = await file.async('text')
        const stripped = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        if (stripped.length > 80 || (text.includes('<p') && stripped.length > 25)) {
          isNovel = true
          break
        }
      } catch { /* skip */ }
      sampleCount++
      if (sampleCount >= 4) break
    }
  }

  // Default to novel if EPUB container has text or undetermined
  if (!isNovel && spineItems.length > 0) {
    const hasAnyImage = spineItems.some(s => s.mediaType.startsWith('image/'))
    if (!hasAnyImage) isNovel = true
  }

  const chapters: ParsedLocalChapter[] = []
  const contentSpine = spineItems.filter(s => s.href !== navHref || spineItems.length === 1)

  let chIdx = 1
  for (const s of contentSpine) {
    let title = tocMap.get(s.href) || ''
    const file = zip.files[s.href]

    if (!title && file) {
      try {
        const head = (await file.async('text')).slice(0, 3000)
        const tMatch = head.match(/<title[^>]*>([^<]+)<\/title>/i) || head.match(/<h[123][^>]*>([^<]+)<\/h[123]>/i)
        if (tMatch) title = tMatch[1].trim()
      } catch { /* non-fatal */ }
    }

    const chNum = extractChapterNumber(title || s.href, meta.rangeStart ? meta.rangeStart + (chIdx - 1) : chIdx)
    if (!title) {
      title = `Chapter ${chNum}`
    }

    chapters.push({
      id: s.href,
      chapterNumber: chNum,
      title,
      imageFileNames: [],
      filePath: s.href,
    })
    chIdx++
  }

  let coverBlob: Blob | undefined
  if (coverHref && zip.files[coverHref]) {
    try {
      coverBlob = await zip.files[coverHref].async('blob')
    } catch { /* non-fatal */ }
  }

  // Deduce series title
  let seriesTitle = meta.seriesTitle
  if (rawCreator && !['unknown', 'anonymous', 'manga-dl'].includes(rawCreator.toLowerCase())) {
    if (rawBookTitle && (rawBookTitle.toLowerCase().includes('chapter') || rawBookTitle.toLowerCase().includes('ch.'))) {
      seriesTitle = rawCreator
    } else if (!seriesTitle || seriesTitle.toLowerCase() === 'manga' || seriesTitle === meta.seriesTitle) {
      seriesTitle = rawCreator
    }
  }
  if ((!seriesTitle || seriesTitle === 'manga') && rawBookTitle) {
    seriesTitle = rawBookTitle.replace(/\s*-\s*Chapter.*$/i, '').trim() || rawBookTitle
  }
  if (!seriesTitle) {
    seriesTitle = originalFilename.replace(/\.epub$/i, '')
  }

  return {
    seriesTitle,
    isMultiChapter: chapters.length > 1,
    rangeStart: chapters[0]?.chapterNumber,
    rangeEnd: chapters[chapters.length - 1]?.chapterNumber,
    chapters,
    coverBlob,
    type: isNovel ? 'novel' : 'manga',
  }
}

/**
 * Inspect an archive (.zip/.cbz/.epub) and group its contents into discrete chapters.
 * Supports:
 * - Novel EPUB archives (.epub) with OPF spine navigation and HTML chapter extraction
 * - MangaKatana 10-chapter subfolder format (Chapter 1/, Chapter 2/, ...)
 * - Flat single-chapter archives (01.jpg, 02.jpg, ...)
 * - Nested folder hierarchy
 */
export async function inspectArchive(fileOrBlob: Blob | ArrayBuffer | Uint8Array, originalFilename = 'manga.cbz'): Promise<ParsedArchive> {
  const data = typeof (fileOrBlob as Blob).arrayBuffer === 'function'
    ? await (fileOrBlob as Blob).arrayBuffer()
    : fileOrBlob
  const zip = await JSZip.loadAsync(data)
  const meta = parseArchiveFilename(originalFilename)

  const isEpub = originalFilename.toLowerCase().endsWith('.epub') ||
    Boolean(zip.files['mimetype']) ||
    Boolean(zip.files['META-INF/container.xml']) ||
    Boolean(zip.files['meta-inf/container.xml'])

  if (isEpub) {
    return inspectEpubArchive(zip, originalFilename, meta)
  }

  const allFilePaths = Object.keys(zip.files).filter(path => {
    const entry = zip.files[path]
    return !entry.dir && VALID_IMAGE_EXTS.some(ext => path.toLowerCase().endsWith(ext))
  })

  if (allFilePaths.length === 0) {
    throw new Error('No valid image files (.png, .jpg, .webp) found inside the archive.')
  }

  // Detect directory structures (e.g. "Chapter 1/01.jpg", "Solo_Leveling_01/01.jpg")
  const directoryMap = new Map<string, string[]>()
  const rootFiles: string[] = []

  for (const path of allFilePaths) {
    const parts = path.split('/').filter(p => p.trim().length > 0)
    if (parts.length > 1) {
      // Subdirectory exists - use first directory level as chapter container
      const dirName = parts[0]
      if (!directoryMap.has(dirName)) {
        directoryMap.set(dirName, [])
      }
      directoryMap.get(dirName)!.push(path)
    } else {
      rootFiles.push(path)
    }
  }

  const chapters: ParsedLocalChapter[] = []

  if (directoryMap.size > 1) {
    // Pattern A: Multi-chapter archive with subfolders (MangaKatana 10-chapter format)
    const sortedDirNames = Array.from(directoryMap.keys()).sort(naturalSort)

    let idx = 1
    for (const dirName of sortedDirNames) {
      const imgPaths = directoryMap.get(dirName)!
      imgPaths.sort(naturalSort)

      const chNum = extractChapterNumber(dirName, meta.rangeStart ? meta.rangeStart + (idx - 1) : idx)
      chapters.push({
        id: `ch-${chNum}`,
        chapterNumber: chNum,
        title: dirName.replace(/[-_]+/g, ' ').trim() || `Chapter ${chNum}`,
        imageFileNames: imgPaths
      })
      idx++
    }
  } else if (directoryMap.size === 1 && rootFiles.length === 0) {
    // Single subfolder containing all images
    const singleDir = Array.from(directoryMap.keys())[0]
    const imgPaths = directoryMap.get(singleDir)!
    imgPaths.sort(naturalSort)

    const chNum = extractChapterNumber(singleDir, meta.rangeStart || 1)
    chapters.push({
      id: `ch-${chNum}`,
      chapterNumber: chNum,
      title: singleDir.replace(/[-_]+/g, ' ').trim() || `Chapter ${chNum}`,
      imageFileNames: imgPaths
    })
  } else {
    // Pattern B: Flat archive (Standard single chapter)
    const allImages = [...rootFiles, ...Array.from(directoryMap.values()).flat()]
    allImages.sort(naturalSort)

    const chNum = meta.rangeStart || 1
    chapters.push({
      id: `ch-${chNum}`,
      chapterNumber: chNum,
      title: meta.isRange ? `${meta.seriesTitle} (${meta.rangeStart}-${meta.rangeEnd})` : `Chapter ${chNum}`,
      imageFileNames: allImages
    })
  }

  // Sort chapters numerically
  chapters.sort((a, b) => a.chapterNumber - b.chapterNumber)

  return {
    seriesTitle: meta.seriesTitle,
    isMultiChapter: chapters.length > 1,
    rangeStart: chapters[0]?.chapterNumber,
    rangeEnd: chapters[chapters.length - 1]?.chapterNumber,
    chapters,
    type: 'manga'
  }
}

/**
 * Extracts image Blob URLs for a specific chapter from a loaded JSZip instance
 */
export async function extractChapterPages(zip: JSZip, imagePaths: string[]): Promise<string[]> {
  const urls: string[] = []
  for (const path of imagePaths) {
    const zipEntry = zip.files[path]
    if (zipEntry) {
      const blob = await zipEntry.async('blob')
      urls.push(URL.createObjectURL(blob))
    }
  }
  return urls
}
