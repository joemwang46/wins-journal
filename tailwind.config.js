/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#faf8f5',
          100: '#f5f0e8',
          200: '#ede4d6',
          300: '#e2d5c3',
        },
        blush: {
          100: '#f2ddd8',
          200: '#e8c4bc',
          300: '#d9a49a',
          400: '#c4796d',
          500: '#a85a50',
        },
        terracotta: {
          100: '#f0e0d6',
          200: '#dcc0b0',
          300: '#c49a88',
          400: '#a87060',
          500: '#8c5045',
        },
        warm: {
          50: '#fdfcfa',
          100: '#f8f4ef',
          200: '#f0e8df',
          700: '#7a6a5e',
          800: '#5c4e44',
          900: '#3d3028',
        },
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ],
        serif: ['"Georgia"', 'Cambria', '"Times New Roman"', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
        'sheet-up': 'sheetUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        sheetUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
