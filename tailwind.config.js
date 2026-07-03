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
          700: '#080A1A',
          800: '#001338',
          900: '#000213',
        },
        gold: {
          300: '#FBE07A',
          400: '#F5C33B',
          500: '#EAA42A',
          600: '#d97706',
        },
      },
    },
  },
  plugins: [],
}
