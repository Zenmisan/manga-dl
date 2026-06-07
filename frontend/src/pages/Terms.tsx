import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ScrollText, ArrowLeft } from 'lucide-react'

export default function TermsPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2 text-white/40 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
              <ScrollText className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">Terms of Service</h1>
              <p className="text-white/30 text-sm">Last updated: June 2026</p>
            </div>
          </div>

          <div className="space-y-8 text-white/70 leading-relaxed">
            <section>
              <h2 className="text-white font-bold text-xl mb-3">1. Acceptance</h2>
              <p>
                By creating an account on manga-dl, you agree to these terms. If you do not agree, do not
                create an account. You may still use the app without an account with limited features.
              </p>
            </section>

            <section>
              <h2 className="text-white font-bold text-xl mb-3">2. Device Limits</h2>
              <p>
                Each account may be active on a maximum of <strong className="text-white">3 devices simultaneously</strong>.
                If you attempt to log in on a 4th device:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>You will be shown a list of your currently active devices.</li>
                <li>You must choose one device to forfeit (log out).</li>
                <li>The forfeited device will be <strong className="text-white">locked from logging in for 30 days</strong>.</li>
                <li>This measure exists to prevent account sharing beyond 3 users.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-white font-bold text-xl mb-3">3. Content & Copyright</h2>
              <p>
                manga-dl is a reading tool. You are responsible for ensuring that any content you download
                or access complies with applicable copyright laws in your jurisdiction. We do not host
                manga content — the app connects to third-party providers.
              </p>
            </section>

            <section>
              <h2 className="text-white font-bold text-xl mb-3">4. Data & Privacy</h2>
              <p>
                We store your email address, reading history, and device session data to provide the service.
                We do not sell your data to third parties. Your reading history is stored securely and associated
                with your account. You can delete your account and all associated data at any time from Settings.
              </p>
            </section>

            <section>
              <h2 className="text-white font-bold text-xl mb-3">5. Account Security</h2>
              <p>
                You are responsible for keeping your account credentials secure. Do not share your password.
                We will never ask for your password via email or chat.
              </p>
            </section>

            <section>
              <h2 className="text-white font-bold text-xl mb-3">6. Service Availability</h2>
              <p>
                manga-dl is provided as-is. We do not guarantee uptime or availability. The service may
                change or be discontinued with reasonable notice.
              </p>
            </section>

            <section>
              <h2 className="text-white font-bold text-xl mb-3">7. Changes to Terms</h2>
              <p>
                We may update these terms. Continued use of the service after notification of changes
                constitutes acceptance of the new terms.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
