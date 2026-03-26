import Header from '@/components/layout/Header'
import RiskMeter from '@/components/sections/RiskMeter'
import EconomyPulse from '@/components/sections/EconomyPulse'
import ConflictTracker from '@/components/sections/ConflictTracker'
import AISector from '@/components/sections/AISector'
import CryptoSignal from '@/components/sections/CryptoSignal'
import HistoricalContext from '@/components/sections/HistoricalContext'

export default function Dashboard() {
  return (
    <>
      <Header />
      <main className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 pb-16 space-y-6">
        {/* Section 1 — Risk Meter (full width, dominant) */}
        <RiskMeter />

        {/* Section 2 — Economy Pulse (full width) */}
        <EconomyPulse />

        {/* Sections 3 + 5 — Conflicts & Crypto (side by side on lg+) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ConflictTracker />
          <CryptoSignal />
        </div>

        {/* Section 4 — AI Sector (full width) */}
        <AISector />

        {/* Section 6 — Historical Context (full width) */}
        <HistoricalContext />
      </main>

      <footer className="border-t border-intel-border py-6 mt-8">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 flex items-center justify-between text-xs text-intel-muted font-mono">
          <span>INTEL — Personal Financial Intelligence</span>
          <span>Data for informational purposes only. Not financial advice.</span>
        </div>
      </footer>
    </>
  )
}
