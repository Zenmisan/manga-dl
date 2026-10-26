import { describe, it, expect, mock } from 'bun:test'
import { handleReaderKeydown } from './useReaderKeybindings'

describe('useReaderKeybindings keyboard handler', () => {
  it('correctly maps forward and backward navigation in LTR mode', () => {
    const nextPageMock = mock(() => {})
    const prevPageMock = mock(() => {})
    const toggleUiMock = mock(() => {})
    const onExitMock = mock(() => {})

    const params = {
      readingMode: 'manga',
      readingDirection: 'ltr' as const,
      prevPage: prevPageMock,
      nextPage: nextPageMock,
      onExit: onExitMock,
      onToggleUi: toggleUiMock,
    }

    // In LTR: ArrowRight should call nextPage
    let prevented = false
    handleReaderKeydown({ key: 'ArrowRight', preventDefault: () => { prevented = true } } as any, params)
    expect(nextPageMock).toHaveBeenCalledTimes(1)
    expect(prevented).toBe(true)

    // In LTR: ArrowLeft should call prevPage
    handleReaderKeydown({ key: 'ArrowLeft', preventDefault: () => {} } as any, params)
    expect(prevPageMock).toHaveBeenCalledTimes(1)

    // Space advances page
    handleReaderKeydown({ code: 'Space', preventDefault: () => {} } as any, params)
    expect(nextPageMock).toHaveBeenCalledTimes(2)

    // Shift + Space goes back
    handleReaderKeydown({ code: 'Space', shiftKey: true, preventDefault: () => {} } as any, params)
    expect(prevPageMock).toHaveBeenCalledTimes(2)

    // 'M' toggles UI
    handleReaderKeydown({ key: 'm', preventDefault: () => {} } as any, params)
    expect(toggleUiMock).toHaveBeenCalledTimes(1)

    // Escape calls onExit
    handleReaderKeydown({ key: 'Escape', preventDefault: () => {} } as any, params)
    expect(onExitMock).toHaveBeenCalledTimes(1)

    // Typing inside INPUT does not trigger navigation
    handleReaderKeydown({
      key: 'ArrowRight',
      target: { tagName: 'INPUT' },
      preventDefault: () => {},
    } as any, params)
    expect(nextPageMock).toHaveBeenCalledTimes(2)
  })

  it('inverts ArrowLeft and ArrowRight when reading RTL manga', () => {
    const nextPageMock = mock(() => {})
    const prevPageMock = mock(() => {})

    const params = {
      readingMode: 'manga-rtl',
      readingDirection: 'rtl' as const,
      prevPage: prevPageMock,
      nextPage: nextPageMock,
    }

    // In RTL: ArrowLeft advances forward (nextPage)
    handleReaderKeydown({ key: 'ArrowLeft', preventDefault: () => {} } as any, params)
    expect(nextPageMock).toHaveBeenCalledTimes(1)
    expect(prevPageMock).toHaveBeenCalledTimes(0)

    // In RTL: ArrowRight goes backward (prevPage)
    handleReaderKeydown({ key: 'ArrowRight', preventDefault: () => {} } as any, params)
    expect(prevPageMock).toHaveBeenCalledTimes(1)

    // 'A' key advances in RTL
    handleReaderKeydown({ key: 'a', preventDefault: () => {} } as any, params)
    expect(nextPageMock).toHaveBeenCalledTimes(2)

    // 'D' key goes back in RTL
    handleReaderKeydown({ key: 'd', preventDefault: () => {} } as any, params)
    expect(prevPageMock).toHaveBeenCalledTimes(2)
  })
})
