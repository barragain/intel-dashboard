import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        intel: {
          bg: '#09090B',
          surface: '#111117',
          elevated: '#1A1A22',
          border: '#27272A',
          'border-active': '#3F3F46',
          gold: '#C8A96E',
          'gold-bright': '#E5C98C',
          text: '#F4F4F5',
          secondary: '#A1A1AA',
          muted: '#71717A',
          dim: '#3F3F46',
        },
        risk: {
          stable: '#22C55E',
          'stable-bg': 'rgba(34,197,94,0.07)',
          'stable-border': 'rgba(34,197,94,0.22)',
          watch: '#F59E0B',
          'watch-bg': 'rgba(245,158,11,0.07)',
          'watch-border': 'rgba(245,158,11,0.22)',
          worried: '#EF4444',
          'worried-bg': 'rgba(239,68,68,0.07)',
          'worried-border': 'rgba(239,68,68,0.22)',
        },
        trend: {
          up: '#4ADE80',
          down: '#F87171',
          neutral: '#6B7280',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-space-grotesk)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glow-stable': '0 0 80px rgba(34,197,94,0.10), 0 0 200px rgba(34,197,94,0.04)',
        'glow-watch': '0 0 80px rgba(245,158,11,0.10), 0 0 200px rgba(245,158,11,0.04)',
        'glow-worried': '0 0 80px rgba(239,68,68,0.10), 0 0 200px rgba(239,68,68,0.04)',
        'glow-gold': '0 0 40px rgba(200,169,110,0.06)',
        'card': '0 1px 0 rgba(255,255,255,0.03)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      screens: {
        xs: '375px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1440px',
      },
    },
  },
  plugins: [],
}

export default config
