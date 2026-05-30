import { useState } from 'react'
import { Shield, Database, Save, RefreshCw } from 'lucide-react'

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('manga-api-key') || '')
  
  const saveKey = () => {
    localStorage.setItem('manga-api-key', apiKey)
    alert('Settings saved locally!')
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Settings</h1>
        <p className="text-gray-400">Configure your local client and remote connection</p>
      </header>

      <div className="space-y-8">
        {/* Security Section */}
        <section className="bg-[#16161a] border border-[#27272a] rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#27272a] flex items-center gap-3">
            <Shield className="w-5 h-5 text-red-500" />
            <h2 className="font-bold">Security</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Remote API Key</label>
              <div className="flex gap-4">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your X-API-Key..."
                  className="flex-1 bg-[#0a0a0c] border border-[#27272a] rounded-xl px-4 py-2 focus:outline-none focus:border-red-600/50"
                />
                <button 
                  onClick={saveKey}
                  className="btn-primary flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
              </div>
              <p className="mt-2 text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                Stored locally in your browser to authorize requests.
              </p>
            </div>
          </div>
        </section>

        {/* Database & Sync */}
        <section className="bg-[#16161a] border border-[#27272a] rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#27272a] flex items-center gap-3">
            <Database className="w-5 h-5 text-red-500" />
            <h2 className="font-bold">Database & Storage</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-200">Synchronize Subscriptions</h4>
                <p className="text-xs text-gray-500">Trigger manual check for new chapters across all providers</p>
              </div>
              <button className="p-2 bg-[#27272a] hover:bg-red-600 rounded-lg transition-all text-gray-400 hover:text-white">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-200">Clear Cache</h4>
                <p className="text-xs text-gray-500">Wipe temporary download files and logs</p>
              </div>
              <button className="px-4 py-2 bg-[#27272a] hover:bg-white hover:text-black rounded-lg transition-all text-xs font-bold uppercase tracking-widest">
                Prune
              </button>
            </div>
          </div>
        </section>

        {/* Info */}
        <div className="flex items-center justify-center gap-6 py-12 opacity-30 grayscale">
           <img src="https://vitejs.dev/logo.svg" className="h-8" />
           <img src="https://reactjs.org/logo-og.png" className="h-8" />
           <img src="https://bun.sh/logo.svg" className="h-8" />
        </div>
      </div>
    </div>
  )
}
