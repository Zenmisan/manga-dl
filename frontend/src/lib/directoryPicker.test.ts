import { describe, it, expect, mock } from 'bun:test'
import {
  sanitizeDirectoryName,
  saveBlobToDirectory,
  verifyDirectoryPermission,
} from './directoryPicker'

describe('directoryPicker File System Access API integration', () => {
  it('sanitizes directory and file names by stripping prohibited characters', () => {
    expect(sanitizeDirectoryName('One: Piece / Wano?')).toBe('One_ Piece _ Wano_')
    expect(sanitizeDirectoryName('Manga<*|"test>')).toBe('Manga____test_')
    expect(sanitizeDirectoryName('   ')).toBe('Manga')
    expect(sanitizeDirectoryName('Ch. 1000 - Raid [HD]')).toBe('Ch. 1000 - Raid [HD]')
  })

  it('verifies directory permissions gracefully', async () => {
    const mockHandleGranted = {
      queryPermission: mock(async () => 'granted'),
      requestPermission: mock(async () => 'granted'),
    }
    const granted = await verifyDirectoryPermission(mockHandleGranted as any)
    expect(granted).toBe(true)

    const mockHandlePrompt = {
      queryPermission: mock(async () => 'prompt'),
      requestPermission: mock(async () => 'granted'),
    }
    const grantedAfterPrompt = await verifyDirectoryPermission(mockHandlePrompt as any)
    expect(grantedAfterPrompt).toBe(true)

    const mockHandleDenied = {
      queryPermission: mock(async () => 'denied'),
      requestPermission: mock(async () => 'denied'),
    }
    const denied = await verifyDirectoryPermission(mockHandleDenied as any)
    expect(denied).toBe(false)
  })

  it('creates subfolder and streams blob archive directly into disk folder', async () => {
    const writtenChunks: any[] = []
    let closed = false

    const mockWritable = {
      write: mock(async (chunk: any) => { writtenChunks.push(chunk) }),
      close: mock(async () => { closed = true }),
    }

    const mockFileHandle = {
      createWritable: mock(async () => mockWritable),
    }

    const mockFolderHandle = {
      getFileHandle: mock(async (name: string, opts: any) => {
        expect(opts.create).toBe(true)
        return mockFileHandle
      }),
    }

    const mockRootHandle = {
      getDirectoryHandle: mock(async (name: string, opts: any) => {
        expect(opts.create).toBe(true)
        return mockFolderHandle
      }),
    }

    const testBlob = new Blob(['sample-cbz-archive-bytes'], { type: 'application/zip' })
    const success = await saveBlobToDirectory(
      mockRootHandle as any,
      'Solo Leveling',
      'Ch. 100.cbz',
      testBlob
    )

    expect(success).toBe(true)
    expect(mockRootHandle.getDirectoryHandle).toHaveBeenCalledTimes(1)
    expect(mockFolderHandle.getFileHandle).toHaveBeenCalledTimes(1)
    expect(mockWritable.write).toHaveBeenCalledTimes(1)
    expect(closed).toBe(true)
  })
})
