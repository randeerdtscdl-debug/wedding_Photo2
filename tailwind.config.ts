import type { Config } from 'tailwindcss';

// Palette + fonts mirror the wedding invitation site (ruby / gold / ivory).
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ruby: { DEFAULT: '#8B0000', dark: '#5C0000', light: '#A32638' },
        wine: '#800020',
        gold: { DEFAULT: '#D4AF37', light: '#E8CE7A', dark: '#A6862A' },
        cream: '#FAFAFA',
        ivory: '#FDF8F3',
        parchment: { 50: '#FBF3EA', 100: '#F4E7D6' },
        cocoa: '#2B1010',
      },
      fontFamily: {
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
        display: ['var(--font-cormorant)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'var(--font-sinhala)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'ruby-gradient': 'linear-gradient(135deg, #8B0000 0%, #800020 100%)',
        'gold-gradient': 'linear-gradient(135deg, #D4AF37 0%, #E8CE7A 50%, #D4AF37 100%)',
      },
      keyframes: {
        sheetUp: { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        pop: { '0%': { transform: 'scale(1)' }, '40%': { transform: 'scale(1.35)' }, '100%': { transform: 'scale(1)' } },
        bar: { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
        rise: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        sheetUp: 'sheetUp .28s ease-out',
        fadeIn: 'fadeIn .2s ease-out',
        pop: 'pop .3s ease-out',
        bar: 'bar 7s linear forwards',
        rise: 'rise .8s ease-out both',
      },
    },
  },
  plugins: [],
};
export default config;
