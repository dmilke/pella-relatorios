/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2721E8',
          50: '#EEEDFD',
          100: '#D2D0FA',
          200: '#B5B2F6',
          300: '#9894F2',
          400: '#7B76EE',
          500: '#2721E8',
          600: '#1F1AB9',
          700: '#17148B',
          800: '#100D5C',
          900: '#08072E',
        },
      },
      fontFamily: {
        sans: ['Albert Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
