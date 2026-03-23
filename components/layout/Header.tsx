'use client'

import React from 'react'
import { useLanguage } from '@/lib/i18n'
import { Activity } from 'lucide-react'

export default function Header() {
  const { language, setLanguage, t } = useLanguage()

  return (
    <header className="sticky top-0 z-50 border-b border-intel-border bg-intel-bg/95 backdrop-blur-sm">
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-display font-black text-xl tracking-[0.2em] text-intel-text">
              INTEL
            </span>
            <span className="hidden sm:block text-[13px] text-intel-muted font-mono tracking-widest uppercase mt-0.5">
              {t.appSubtitle}
            </span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="hidden sm:flex items-center gap-1.5">
            <div className="relative flex items-center justify-center">
              <span className="absolute w-2.5 h-2.5 rounded-full bg-risk-stable opacity-25 animate-ping" />
              <span className="relative w-1.5 h-1.5 rounded-full bg-risk-stable animate-pulse" />
            </div>
            <span className="text-[13px] font-mono text-intel-muted tracking-widest uppercase">
              {t.live}
            </span>
          </div>

          <div className="w-px h-4 bg-intel-border" />

          {/* Language toggle */}
          <div className="flex items-center rounded overflow-hidden border border-intel-border">
            {(['en', 'fr', 'es'] as const).map((lang, i) => (
              <React.Fragment key={lang}>
                {i > 0 && <div className="w-px h-full bg-intel-border" />}
                <button
                  onClick={() => setLanguage(lang)}
                  className={`px-2.5 py-1 text-sm font-mono font-medium transition-colors ${
                    language === lang
                      ? 'bg-intel-gold text-intel-bg'
                      : 'text-intel-muted hover:text-intel-text'
                  }`}
                  aria-pressed={language === lang}
                >
                  {lang.toUpperCase()}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Gold accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-intel-gold/30 to-transparent" />
    </header>
  )
}
