/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#eef2f9',
          100: '#d5dff0',
          200: '#aabfe1',
          300: '#7a9acf',
          400: '#4e77bc',
          500: '#2d5aa0',
          600: '#1e3f7a',
          700: '#162e5c',
          800: '#0f2040',
          900: '#091528',
        },
        gold: {
          300: '#fde68a',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
      },
    },
  },
  plugins: [],
}
