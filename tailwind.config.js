/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#F4F8EE',
          100: '#DCE9BE',
          200: '#F0F6E0',
          300: '#C3D49A',
          400: '#8BAF5E',
          500: '#739949',
          600: '#5F7F3B',
          700: '#4D6830',
          800: '#7A8F58',
          900: '#6B7C45',
        },
        sable:   '#F5F0E8',
        pivoine: '#C2185B',
        teal:    '#4DB6AC',
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
