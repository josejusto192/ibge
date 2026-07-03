/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#f0f4fa',
          100: '#dce5f3',
          200: '#b3c4e5',
          300: '#7a9acf',
          400: '#4a72b0',
          500: '#2d5390',
          600: '#1a3a6b',
          700: '#122952',
          800: '#0C1E3D',
          900: '#081529',
        },
        gold: {
          300: '#FDE68A',
          400: '#F5C33B',
          500: '#D4A017',
          600: '#B8860B',
        },
      },
    },
  },
  plugins: [],
}
