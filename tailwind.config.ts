import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0F',
        surface: '#12121A',
        surface2: '#1A1A26',
        border: '#2A2A3D',
        primary: '#7B5EA7',
        primaryGlow: '#7B5EA730',
        success: '#22C55E',
        danger: '#EF4444',
        warning: '#F59E0B',
        textPrimary: '#FFFFFF',
        textSecondary: '#A0A0B8',
        textMuted: '#505070',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        logo: ['20px', { lineHeight: '24px', fontWeight: '800' }],
        page: ['24px', { lineHeight: '32px', fontWeight: '700' }],
        section: ['14px', { lineHeight: '20px', fontWeight: '600', letterSpacing: '0.08em' }],
        body: ['13px', { lineHeight: '20px', fontWeight: '400' }],
        meta: ['11px', { lineHeight: '16px', fontWeight: '400' }],
        keynum: ['28px', { lineHeight: '34px', fontWeight: '700' }],
      },
      boxShadow: {
        glow: '0 0 24px 0 #7B5EA730',
        'glow-sm': '0 0 12px 0 #7B5EA730',
      },
      keyframes: {
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(0.85)' },
        },
      },
      animation: {
        'slide-down': 'slide-down 250ms ease-out',
        shimmer: 'shimmer 1.4s linear infinite',
        'pulse-dot': 'pulse-dot 1.6s ease-in-out infinite',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [],
};

export default config;
