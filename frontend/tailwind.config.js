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
          50: '#f0f7f1',
          100: '#dbede0',
          200: '#b8dcbf',
          300: '#90c99a',
          400: '#59aa6b',
          500: '#0B6623',  // Forest Green
          600: '#09541d',
          700: '#074317',
          800: '#053211',
          900: '#03200b',
        }
      }
    },
  },
  plugins: [],
}