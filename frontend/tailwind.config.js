/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
          900: '#14532d',
        },
        nebius: {
          purple: '#7928ca',
          cyan: '#00dfd8',
        },
        nvidia: '#76b900'
      }
    },
  },
  plugins: [],
}
