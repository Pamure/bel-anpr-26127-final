/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#07090E',
        'bg-surface': '#0E131F',
        'bg-elevated': '#161D2E',
        accent: { primary: '#00E599', secondary: '#00B4D8', warning: '#FFB020', critical: '#FF334B' },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        ui: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}