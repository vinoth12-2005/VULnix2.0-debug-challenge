/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'obsidian': '#0a0a0c',
        'myth-dark': '#141416',
        'myth-darker': '#050506',
        'myth-gold': '#d4af37',
        'myth-gold-glow': 'rgba(212, 175, 55, 0.4)',
        'myth-red': '#8b0000',
        'myth-red-glow': 'rgba(139, 0, 0, 0.5)',
        'myth-jade': '#2e8b57',
      },
      fontFamily: {
        myth: ['"Cinzel"', 'serif'],
        body: ['"Noto Serif TC"', 'serif'],
        mono: ['"Fira Code"', 'monospace'],
      },
      boxShadow: {
        'myth-gold': '0 0 10px rgba(212, 175, 55, 0.4), 0 0 20px rgba(212, 175, 55, 0.2)',
        'myth-red': '0 0 10px rgba(139, 0, 0, 0.5), 0 0 20px rgba(139, 0, 0, 0.3)',
      },
      backgroundImage: {
        'ink-wash': 'radial-gradient(circle at center, rgba(30,30,40,0.4) 0%, rgba(10,10,12,1) 100%)',
      }
    },
  },
  plugins: [],
}
