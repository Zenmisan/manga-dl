import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Settings, BookOpen, LayoutGrid, Share2, Database, Info, ChevronRight, ChevronLeft } from 'lucide-react'
import { cn } from '../lib/utils'

export default function SettingsLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  
  const tabs = [
    { id: 'general', label: 'General', icon: Settings, path: '/settings/general' },
    { id: 'reader', label: 'Reader', icon: BookOpen, path: '/settings/reader' },
    { id: 'library', label: 'Library', icon: LayoutGrid, path: '/settings/library' },
    { id: 'trackers', label: 'Trackers', icon: Share2, path: '/settings/trackers' },
    { id: 'system', label: 'System', icon: Database, path: '/settings/system' },
  ]

  const currentTab = tabs.find(t => location.pathname === t.path) || tabs[0]

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-black/10">
      {/* Settings Sidebar / Nav */}
      <aside className="w-full md:w-64 lg:w-80 border-b md:border-b-0 md:border-r border-white/5 bg-black/20 backdrop-blur-xl shrink-0">
        <div className="p-6 md:p-8">
          <button 
            onClick={() => navigate('/more')}
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-6 md:mb-8 group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest">Back to More</span>
          </button>
          
          <h1 className="text-3xl font-extrabold tracking-tight mb-8 hidden md:block">Settings</h1>
          
          <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible no-scrollbar pb-4 md:pb-0">
            {tabs.map((tab) => (
              <NavLink
                key={tab.id}
                to={tab.path}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 shrink-0 md:shrink",
                  isActive 
                    ? "bg-red-500/10 text-red-500 border border-red-500/20 shadow-lg shadow-red-500/5" 
                    : "text-white/40 hover:text-white hover:bg-white/5 border border-transparent"
                )}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-sm font-bold">{tab.label}</span>
                {location.pathname === tab.path && (
                  <ChevronRight className="w-4 h-4 ml-auto hidden md:block" />
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      {/* Settings Content */}
      <main className="flex-1 min-w-0 h-full overflow-y-auto">
        <div className="p-6 md:p-12 lg:p-16 max-w-4xl">
          <header className="mb-10 md:hidden">
            <div className="flex items-center gap-3 mb-2">
              <currentTab.icon className="w-5 h-5 text-red-500" />
              <h2 className="text-2xl font-black">{currentTab.label}</h2>
            </div>
            <p className="text-sm text-white/40 font-medium">Configure your client and connections</p>
          </header>

          <header className="mb-12 hidden md:block">
            <h2 className="text-4xl font-black tracking-tight mb-2">{currentTab.label} Settings</h2>
            <p className="text-lg text-white/40 font-medium">Configure your {currentTab.label.toLowerCase()} preferences</p>
          </header>

          <Outlet />

          {/* Footer Info */}
          <footer className="mt-20 pt-10 border-t border-white/5 flex flex-col items-center gap-8 grayscale opacity-40 hover:opacity-100 transition-all duration-700 pb-12">
            <div className="flex items-center gap-8">
              <img src="https://vitejs.dev/logo.svg" className="h-6" alt="Vite" />
              <img src="https://reactjs.org/logo-og.png" className="h-6" alt="React" />
              <img src="https://bun.sh/logo.svg" className="h-6" alt="Bun" />
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/50">
              <Info className="w-3 h-3" />
              Build 2026.06.16
            </div>
          </footer>
        </div>
      </main>
    </div>
  )
}
