/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
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
        '3xl': '1.75rem',
      },
      boxShadow: {
        glow: '0 0 24px rgba(11, 102, 35, 0.45), 0 8px 40px rgba(7, 67, 23, 0.35)',
        'glow-lg': '0 0 40px rgba(89, 170, 107, 0.5), 0 20px 60px rgba(7, 67, 23, 0.4)',
        glass: '0 8px 32px rgba(0, 0, 0, 0.12)',
      },
      animation: {
        'float-soft': 'float-soft 4s ease-in-out infinite',
        'blob-drift': 'blob-drift 9s ease-in-out infinite',
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