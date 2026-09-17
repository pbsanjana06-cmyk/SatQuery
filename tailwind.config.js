/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#020817',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(96,165,250,0.2), 0 20px 45px rgba(15,23,42,0.35)',
      },
    },
  },
  plugins: [],
}
