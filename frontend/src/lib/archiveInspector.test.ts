import { describe, it, expect } from 'bun:test'
import JSZip from 'jszip'
import { inspectArchive, parseArchiveFilename, normalizeZipPath } from './archiveInspector'

describe('parseArchiveFilename', () => {
  it('parses series title and range from filename', () => {
    const meta = parseArchiveFilename('Solo_Leveling_01-10.zip')
    expect(meta.seriesTitle).toBe('Solo Leveling')
    expect(meta.rangeStart).toBe(1)
    expect(meta.rangeEnd).toBe(10)
    expect(meta.isRange).toBe(true)
  })

  it('parses single chapter from epub filename', () => {
    const meta = parseArchiveFilename('Shadow Slave - Chapter 45.epub')
    expect(meta.seriesTitle).toBe('Shadow Slave')
    expect(meta.rangeStart).toBe(45)
    expect(meta.rangeEnd).toBe(45)
  })
})

describe('normalizeZipPath', () => {
  it('handles relative parent directory navigation', () => {
    expect(normalizeZipPath('OEBPS/text/../images/cover.jpg')).toBe('OEBPS/images/cover.jpg')
    expect(normalizeZipPath('OEBPS/./chapter1.xhtml')).toBe('OEBPS/chapter1.xhtml')
  })
})

describe('inspectArchive with EPUB', () => {
  it('identifies and extracts novel EPUB chapters and metadata', async () => {
    const zip = new JSZip()
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })
    zip.file(
      'META-INF/container.xml',
      `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
    )
    zip.file(
      'OEBPS/content.opf',
      `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Chapter 10: The Dungeon</dc:title>
    <dc:creator>Solo Leveling</dc:creator>
  </metadata>
  <manifest>
    <item id="chapter" href="chapter10.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="chapter"/>
  </spine>
</package>`
    )
    zip.file(
      'OEBPS/chapter10.xhtml',
      `<!DOCTYPE html>
<html>
  <head><title>Chapter 10: The Dungeon</title></head>
  <body>
    <h1>Chapter 10: The Dungeon</h1>
    <p>Jin-Woo walked deeper into the shadowy dungeon, feeling the cold air brush against his skin.</p>
  </body>
</html>`
    )

    const blob = await zip.generateAsync({ type: 'blob' })
    const result = await inspectArchive(blob, 'Solo Leveling - Chapter 10.epub')

    expect(result.type).toBe('novel')
    expect(result.seriesTitle).toBe('Solo Leveling')
    expect(result.chapters.length).toBe(1)
    expect(result.chapters[0].title).toBe('Chapter 10: The Dungeon')
    expect(result.chapters[0].chapterNumber).toBe(10)
    expect(result.chapters[0].filePath).toBe('OEBPS/chapter10.xhtml')
  })

  it('handles multi-chapter novel EPUBs with navigation', async () => {
    const zip = new JSZip()
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })
    zip.file(
      'META-INF/container.xml',
      `<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`
    )
    zip.file(
      'content.opf',
      `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Omniscient Reader</dc:title>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="ch2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
  </spine>
</package>`
    )
    zip.file(
      'toc.ncx',
      `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <navMap>
    <navPoint id="p1"><navLabel><text>Prologue: Starting the Paid Service</text></navLabel><content src="ch1.xhtml"/></navPoint>
    <navPoint id="p2"><navLabel><text>Chapter 1: The First Scenario</text></navLabel><content src="ch2.xhtml"/></navPoint>
  </navMap>
</ncx>`
    )
    zip.file('ch1.xhtml', `<html><body><p>There are three ways to survive in a ruined world. I have forgotten some of them now.</p></body></html>`)
    zip.file('ch2.xhtml', `<html><body><p>The dokkaebi appeared in the subway carriage with a twisted grin.</p></body></html>`)

    const blob = await zip.generateAsync({ type: 'blob' })
    const result = await inspectArchive(blob, 'Omniscient Reader.epub')

    expect(result.type).toBe('novel')
    expect(result.seriesTitle).toBe('Omniscient Reader')
    expect(result.isMultiChapter).toBe(true)
    expect(result.chapters.length).toBe(2)
    expect(result.chapters[0].title).toBe('Prologue: Starting the Paid Service')
    expect(result.chapters[1].title).toBe('Chapter 1: The First Scenario')
    expect(result.chapters[1].chapterNumber).toBe(1)
  })

  it('correctly handles standard manga CBZ archives with images', async () => {
    const zip = new JSZip()
    zip.file('01.jpg', new Uint8Array([1, 2, 3]))
    zip.file('02.jpg', new Uint8Array([4, 5, 6]))

    const blob = await zip.generateAsync({ type: 'blob' })
    const result = await inspectArchive(blob, 'Chainsaw Man Chapter 150.cbz')

    expect(result.type).toBe('manga')
    expect(result.seriesTitle).toBe('Chainsaw Man')
    expect(result.chapters.length).toBe(1)
    expect(result.chapters[0].chapterNumber).toBe(150)
    expect(result.chapters[0].imageFileNames.length).toBe(2)
  })
})
