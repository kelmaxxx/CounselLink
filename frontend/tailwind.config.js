/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Figtree', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        // One-notch bump for a roomier, Gemini-like scale (base stays 16px)
        xs: ['0.8125rem', { lineHeight: '1.25rem' }],  // 13px
        sm: ['0.9375rem', { lineHeight: '1.45rem' }],  // 15px
      },
      borderRadius: {
        md: '0.5rem',
        lg: '0.875rem',
        xl: '1rem',
        '2xl': '1.25rem',
      },
      spacing: {
        '25': '6.25rem', // 100px
      },
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