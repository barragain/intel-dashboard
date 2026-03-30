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
          bg: '#fdf5e6',
          surface: '#f9eed6',
          elevated: '#f4e6c6',
          border: '#bab19b',
          'border-active': '#eadab8',
          gold: '#cd5c5c',
          'gold-bright': '#f2b8b8',
          text: '#373222',
          secondary: '#6b6351',
          muted: '#6b6351',
          dim: '#bab19b',
        },
        risk: {
          stable: '#778c70',
          'stable-bg': 'rgba(119,140,112,0.07)',
          'stable-border': 'rgba(119,140,112,0.22)',
          watch: '#f0ad4e',
          'watch-bg': 'rgba(240,173,78,0.07)',
          'watch-border': 'rgba(240,173,78,0.22)',
          worried: '#cd5c5c',
          'worried-bg': 'rgba(205,92,92,0.07)',
          'worried-border': 'rgba(205,92,92,0.22)',
        },
        trend: {
          up: '#778c70',
          down: '#cd5c5c',
          neutral: '#6b6351',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-space-grotesk)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glow-stable': '0 0 80px rgba(119,140,112,0.10), 0 0 200px rgba(119,140,112,0.04)',
        'glow-watch': '0 0 80px rgba(240,173,78,0.10), 0 0 200px rgba(240,173,78,0.04)',
        'glow-worried': '0 0 80px rgba(205,92,92,0.10), 0 0 200px rgba(205,92,92,0.04)',
        'glow-gold': '0 0 40px rgba(205,92,92,0.06)',
        'card': '0 1px 0 rgba(55,50,34,0.03)',
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
