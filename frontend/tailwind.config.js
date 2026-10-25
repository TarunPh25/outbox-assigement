/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        logo: ['Silkscreen', 'monospace'],
        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: { DEFAULT: '#22d3a5', dark: '#16b38a', soft: 'rgba(34,211,165,0.12)', line: 'rgba(34,211,165,0.35)' },
        surface: {
          DEFAULT: 'rgba(255,255,255,0.04)',
          hover: 'rgba(255,255,255,0.07)',
          raised: 'rgba(255,255,255,0.08)',
          border: 'rgba(255,255,255,0.09)',
        },
        night: {
          900: '#070b12',
          800: '#0d1220',
          700: '#111827',
          600: '#1c2535',
        },
        ink: '#e8edf5',
        muted: '#8a9ab5',
      },
      backgroundImage: {
        'glow-brand': 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(34,211,165,0.15) 0%, transparent 70%)',
        'glow-purple': 'radial-gradient(ellipse 40% 30% at 80% 20%, rgba(139,92,246,0.1) 0%, transparent 70%)',
      },
      boxShadow: {
        glass: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        glow: '0 0 20px rgba(34,211,165,0.25)',
        'glow-sm': '0 0 8px rgba(34,211,165,0.2)',
      },
      backdropBlur: { glass: '16px' },
      keyframes: {
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        pulse2: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.5' } },
      },
      animation: {
        'fade-up': 'fadeUp 0.3s ease forwards',
        shimmer: 'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
};
