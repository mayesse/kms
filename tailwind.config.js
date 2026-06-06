import forms from '@tailwindcss/forms'
import rtl from 'tailwindcss-rtl'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Tajawal', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    forms,
    rtl,
  ],
}
