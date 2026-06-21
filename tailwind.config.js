/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#e8f0f9',
          100: '#c5d8f0',
          200: '#9fbfe7',
          300: '#78a5de',
          400: '#5891d7',
          500: '#3a7dd0',
          600: '#2a6abf',
          700: '#1d56a6',
          800: '#0C447C',
          900: '#083360',
        },
        success: {
          50:  '#eaf4e5',
          100: '#c8e4bc',
          200: '#a2d290',
          300: '#7bbf63',
          400: '#5aaf3e',
          500: '#3a9f1a',
          600: '#338d16',
          700: '#2a7812',
          800: '#27500A',
          900: '#1a3507',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        arabic: ['Noto Sans Arabic', 'sans-serif'],
      },
      screens: {
        'xs': '360px',
      },
    },
  },
  plugins: [],
}
