import { useState, useEffect } from 'react'

export function Titlebar() {
  const [windowApi, setWindowApi] = useState<any>(null)

  useEffect(() => {
    // Only import tauri APIs dynamically in browser/native environment
    import('@tauri-apps/api/window')
      .then(({ getCurrentWindow }) => {
        setWindowApi(getCurrentWindow())
      })
      .catch(() => {
        // Not running in Tauri environment
      })
  }, [])

  const handleMinimize = () => {
    windowApi?.minimize().catch(() => {})
  }

  const handleMaximize = () => {
    windowApi?.toggleMaximize().catch(() => {})
  }

  const handleClose = () => {
    windowApi?.close().catch(() => {})
  }

  return (
    <div 
      className="h-8 bg-black/40 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 select-none z-50 shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      data-tauri-drag-region
    >
      {/* Title & Logo */}
      <div 
        className="flex items-center gap-2 pointer-events-none select-none" 
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <img src="/Manga-dl1.png" alt="manga-dl logo" className="w-4 h-4 object-contain" />
        <span 
          className="text-[10px] font-black tracking-[0.2em] text-white/50 uppercase"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          manga-dl
        </span>
      </div>

      {/* Drag Area Middle Spacer */}
      <div className="flex-grow h-full" data-tauri-drag-region />

      {/* Traffic Light Windows Controls */}
      <div 
        className="flex items-center gap-2.5" 
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Minimize */}
        <button
          onClick={handleMinimize}
          className="w-3 h-3 rounded-full bg-amber-500/70 hover:bg-amber-400 active:scale-95 transition-all flex items-center justify-center group cursor-pointer"
          title="Minimize"
        >
          <span className="w-1.5 h-0.5 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* Maximize */}
        <button
          onClick={handleMaximize}
          className="w-3 h-3 rounded-full bg-emerald-500/70 hover:bg-emerald-400 active:scale-95 transition-all flex items-center justify-center group cursor-pointer"
          title="Maximize"
        >
          <span className="w-1.5 h-1.5 border border-black/60 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          className="w-3 h-3 rounded-full bg-red-500/70 hover:bg-red-400 active:scale-95 transition-all flex items-center justify-center group cursor-pointer"
          title="Close"
        >
          <span className="text-[8px] font-black text-black/60 leading-none opacity-0 group-hover:opacity-100 transition-opacity">
            ✕
          </span>
        </button>
      </div>
    </div>
  )
}
