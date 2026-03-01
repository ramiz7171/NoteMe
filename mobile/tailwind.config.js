/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        accent: '#3b82f6',
        'accent-dark': '#2563eb',
        glass: {
          light: 'rgba(255, 255, 255, 0.7)',
          dark: 'rgba(30, 30, 30, 0.7)',
        },
        surface: {
          light: '#ffffff',
          dark: '#1e1e1e',
        },
        bg: {
          light: '#f0f0f0',
          dark: '#141414',
        },
      },
    },
  },
  plugins: [],
};
