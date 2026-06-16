import { useAppStore } from '../../lib/store'
import { BookOpen } from 'lucide-react'

export default function ReaderSettings() {
  const { 
    tapZoneLayout, setTapZoneLayout, 
    cropBorders, setCropBorders, 
    dualPageSpread, setDualPageSpread, 
    webtoonSidePadding, setWebtoonSidePadding, 
    cropBordersWebtoon, setCropBordersWebtoon 
  } = useAppStore()

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <section className="glass-panel overflow-hidden border-white/5">
        <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <BookOpen className="w-5 h-5 text-indigo-400" />
          </div>
          <h2 className="font-bold text-lg">Reader Appearance</h2>
        </div>
        <div className="p-6 md:p-8 space-y-6">
          {/* Tap Zone Layout */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-white/30 mb-3">Reader Tap Zones</label>
            <div className="flex gap-2 flex-wrap">
              {([['default','Default'],['l-nav','L-Nav'],['edge','Edge'],['disabled','Disabled']] as const).map(([v, label]) => (
                <button key={v}
                  onClick={() => setTapZoneLayout(v)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                    tapZoneLayout === v ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'text-white/30 border-white/10 hover:border-white/20'
                  }`}
                >{label}</button>
              ))}
            </div>
            <p className="text-[10px] text-white/20 mt-2">
              {tapZoneLayout === 'default' && 'Left 1/3 = prev, right 1/3 = next, center = toggle UI'}
              {tapZoneLayout === 'l-nav' && 'Left half = prev, right half = next'}
              {tapZoneLayout === 'edge' && '15% edges only for navigation'}
              {tapZoneLayout === 'disabled' && 'Taps only toggle UI — no navigation'}
            </p>
          </div>
          {/* Crop Borders */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <div>
              <h4 className="font-bold text-sm">Crop Borders</h4>
              <p className="text-xs text-white/30 mt-0.5">Remove whitespace margins from page images</p>
            </div>
            <button
              onClick={() => setCropBorders(!cropBorders)}
              className={`w-12 h-6 rounded-full relative transition-all border ${cropBorders ? 'bg-indigo-500/30 border-indigo-500/40' : 'bg-white/5 border-white/10'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${cropBorders ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>
          {/* Dual Page Spread */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-white/30 mb-3">Dual-Page Spread (Pager modes)</label>
            <div className="flex gap-2">
              {([['auto','Auto (landscape)'],['on','Always On'],['off','Off']] as const).map(([v, label]) => (
                <button key={v}
                  onClick={() => setDualPageSpread(v)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                    dualPageSpread === v ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'text-white/30 border-white/10 hover:border-white/20'
                  }`}
                >{label}</button>
              ))}
            </div>
          </div>
          
          {/* Webtoon settings */}
          <div className="pt-6 border-t border-white/5 space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/30">Webtoon Mode</h3>
            {/* Webtoon side padding */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-white/30 mb-3">
                Side Padding — {webtoonSidePadding}px
              </label>
              <input
                type="range"
                min={0} max={80} step={4}
                value={webtoonSidePadding}
                onChange={e => setWebtoonSidePadding(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
            {/* Crop borders webtoon */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div>
                <h4 className="font-bold text-sm">Crop Borders (Webtoon)</h4>
                <p className="text-xs text-white/30 mt-0.5">Use object-cover to crop horizontal whitespace in webtoon strips</p>
              </div>
              <button
                onClick={() => setCropBordersWebtoon(!cropBordersWebtoon)}
                className={`w-12 h-6 rounded-full relative transition-all border ${cropBordersWebtoon ? 'bg-indigo-500/30 border-indigo-500/40' : 'bg-white/5 border-white/10'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${cropBordersWebtoon ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
