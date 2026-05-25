/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        maroon: {
          50: '#f5e6e6',
          100: '#e6cccc',
          200: '#cc9999',
          300: '#b36666',
          400: '#994d4d',
          500: '#7a1d1d',  // MSU maroon
          600: '#6b1919',
          700: '#5a0a0a',
          800: '#4a0a0a',
          900: '#3a0a0a',
        }
      }
    },
  },
  plugins: [],
}