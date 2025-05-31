/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './pages/**/*.{js,ts,jsx,tsx,mdx}',
      './components/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
      extend: {
        colors: {
          purple: {
            400: '#a855f7',
            500: '#9333ea',
            600: '#7c3aed',
            700: '#6d28d9',
            900: '#4c1d95',
          },
          pink: {
            400: '#f472b6',
            500: '#ec4899',
            900: '#831843',
          },
        },
      },
    },
    plugins: [],
  }