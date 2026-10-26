import { useEffect, useRef } from 'react'

export interface ReaderGamepadOptions {
  readingMode: string
  nextPage: () => void
  prevPage: () => void
  onNextChapter?: () => void
  onPrevChapter?: () => void
  onToggleUi?: () => void
  onExit?: () => void
}

export function useReaderGamepad({
  readingMode,
  nextPage,
  prevPage,
  onNextChapter,
  onPrevChapter,
  onToggleUi,
  onExit,
}: ReaderGamepadOptions) {
  const optionsRef = useRef({
    readingMode,
    nextPage,
    prevPage,
    onNextChapter,
    onPrevChapter,
    onToggleUi,
    onExit,
  })

  useEffect(() => {
    optionsRef.current = {
      readingMode,
      nextPage,
      prevPage,
      onNextChapter,
      onPrevChapter,
      onToggleUi,
      onExit,
    }
  }, [readingMode, nextPage, prevPage, onNextChapter, onPrevChapter, onToggleUi, onExit])

  useEffect(() => {
    if (typeof window === 'undefined' || !('getGamepads' in navigator)) return

    let rafId: number | null = null
    const lastPressTimeRef = new Map<number, number>()
    const isPressedRef = new Map<number, boolean>()
    const DEBOUNCE_MS = 250

    const canTrigger = (btnIndex: number): boolean => {
      const now = performance.now()
      const last = lastPressTimeRef.get(btnIndex) || 0
      if (now - last > DEBOUNCE_MS) {
        lastPressTimeRef.set(btnIndex, now)
        return true
      }
      return false
    }

    const pollGamepad = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : []
      let anyGamepadActive = false

      for (let i = 0; i < gamepads.length; i++) {
        const gp = gamepads[i]
        if (!gp || !gp.connected) continue
        anyGamepadActive = true

        const opts = optionsRef.current
        const isRtl = opts.readingMode === 'manga-rtl'
        const isScrollMode = opts.readingMode === 'webtoon' || opts.readingMode === 'vertical-pager'

        // Button 0 (A / Cross): Advance next page
        const b0 = gp.buttons[0]?.pressed
        if (b0 && !isPressedRef.get(0) && canTrigger(0)) {
          if (isScrollMode) window.scrollBy({ top: 350, behavior: 'smooth' })
          else opts.nextPage()
        }
        isPressedRef.set(0, !!b0)

        // Button 1 (B / Circle): Previous page
        const b1 = gp.buttons[1]?.pressed
        if (b1 && !isPressedRef.get(1) && canTrigger(1)) {
          if (isScrollMode) window.scrollBy({ top: -350, behavior: 'smooth' })
          else opts.prevPage()
        }
        isPressedRef.set(1, !!b1)

        // Button 3 (Y / Triangle): Toggle UI
        const b3 = gp.buttons[3]?.pressed
        if (b3 && !isPressedRef.get(3) && canTrigger(3)) {
          opts.onToggleUi?.()
        }
        isPressedRef.set(3, !!b3)

        // Button 4 (L1 / Left Bumper): Prev Page / Scroll Up
        const b4 = gp.buttons[4]?.pressed
        if (b4 && !isPressedRef.get(4) && canTrigger(4)) {
          if (isScrollMode) window.scrollBy({ top: -350, behavior: 'smooth' })
          else if (isRtl) opts.nextPage()
          else opts.prevPage()
        }
        isPressedRef.set(4, !!b4)

        // Button 5 (R1 / Right Bumper): Next Page / Scroll Down
        const b5 = gp.buttons[5]?.pressed
        if (b5 && !isPressedRef.get(5) && canTrigger(5)) {
          if (isScrollMode) window.scrollBy({ top: 350, behavior: 'smooth' })
          else if (isRtl) opts.prevPage()
          else opts.nextPage()
        }
        isPressedRef.set(5, !!b5)

        // Button 6 (L2 / Left Trigger): Previous Chapter
        const b6 = gp.buttons[6]?.pressed
        if (b6 && !isPressedRef.get(6) && canTrigger(6)) {
          opts.onPrevChapter?.()
        }
        isPressedRef.set(6, !!b6)

        // Button 7 (R2 / Right Trigger): Next Chapter
        const b7 = gp.buttons[7]?.pressed
        if (b7 && !isPressedRef.get(7) && canTrigger(7)) {
          opts.onNextChapter?.()
        }
        isPressedRef.set(7, !!b7)

        // Button 9 (Start / Options): Exit reader
        const b9 = gp.buttons[9]?.pressed
        if (b9 && !isPressedRef.get(9) && canTrigger(9)) {
          opts.onExit?.()
        }
        isPressedRef.set(9, !!b9)

        // D-pad Up (12): Scroll up or prev page
        const b12 = gp.buttons[12]?.pressed
        if (b12 && !isPressedRef.get(12) && canTrigger(12)) {
          if (isScrollMode) window.scrollBy({ top: -350, behavior: 'smooth' })
          else opts.prevPage()
        }
        isPressedRef.set(12, !!b12)

        // D-pad Down (13): Scroll down or next page
        const b13 = gp.buttons[13]?.pressed
        if (b13 && !isPressedRef.get(13) && canTrigger(13)) {
          if (isScrollMode) window.scrollBy({ top: 350, behavior: 'smooth' })
          else opts.nextPage()
        }
        isPressedRef.set(13, !!b13)

        // D-pad Left (14): Left navigation (respects RTL)
        const b14 = gp.buttons[14]?.pressed
        if (b14 && !isPressedRef.get(14) && canTrigger(14)) {
          if (isRtl) opts.nextPage()
          else opts.prevPage()
        }
        isPressedRef.set(14, !!b14)

        // D-pad Right (15): Right navigation (respects RTL)
        const b15 = gp.buttons[15]?.pressed
        if (b15 && !isPressedRef.get(15) && canTrigger(15)) {
          if (isRtl) opts.prevPage()
          else opts.nextPage()
        }
        isPressedRef.set(15, !!b15)

        // Analog Stick (Y-axis for webtoon scrolling)
        if (isScrollMode && gp.axes && gp.axes.length > 1) {
          const axisY = gp.axes[1]
          if (Math.abs(axisY) > 0.2) {
            window.scrollBy({ top: axisY * 20, behavior: 'auto' })
          }
        }
      }

      if (anyGamepadActive) {
        rafId = requestAnimationFrame(pollGamepad)
      } else {
        rafId = null
      }
    }

    const startPolling = () => {
      if (!rafId) {
        rafId = requestAnimationFrame(pollGamepad)
      }
    }

    const handleConnected = () => startPolling()
    const handleDisconnected = () => {
      const active = (navigator.getGamepads ? navigator.getGamepads() : []).some(gp => gp && gp.connected)
      if (!active && rafId) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
    }

    window.addEventListener('gamepadconnected', handleConnected)
    window.addEventListener('gamepaddisconnected', handleDisconnected)

    // Check if a gamepad is already plugged in on mount
    const initialConnected = (navigator.getGamepads ? navigator.getGamepads() : []).some(gp => gp && gp.connected)
    if (initialConnected) {
      startPolling()
    }

    return () => {
      window.removeEventListener('gamepadconnected', handleConnected)
      window.removeEventListener('gamepaddisconnected', handleDisconnected)
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [])
}
