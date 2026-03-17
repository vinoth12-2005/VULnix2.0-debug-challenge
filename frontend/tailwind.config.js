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
        'myth-gold': '#ffd700',
        'myth-gold-glow': 'rgba(255, 215, 0, 0.4)',
        'myth-red': '#ff2a2a',
        'myth-red-glow': 'rgba(255, 42, 42, 0.5)',
        'myth-jade': '#2e8b57',
      },
      fontFamily: {
        myth: ['"Cinzel"', 'serif'],
        body: ['"Noto Serif TC"', 'serif'],
        mono: ['"Fira Code"', 'monospace'],
      },
      boxShadow: {
        'myth-gold': '0 0 10px rgba(255, 215, 0, 0.4), 0 0 20px rgba(255, 215, 0, 0.2)',
        'myth-red': '0 0 10px rgba(255, 42, 42, 0.5), 0 0 20px rgba(255, 42, 42, 0.3)',
      },
      backgroundImage: {
        'ink-wash': 'radial-gradient(circle at center, rgba(30,30,40,0.4) 0%, rgba(10,10,12,1) 100%)',
      }
    },
  },
  plugins: [],
}
