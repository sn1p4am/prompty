/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#667eea',
          dark: '#764ba2',
        },
        secondary: {
          light: '#f093fb',
          dark: '#f5576c',
        },
        success: {
          light: '#4facfe',
          dark: '#00f2fe',
        },
        error: {
          light: '#fa709a',
          dark: '#fee140',
        },
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'secondary-gradient': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'success-gradient': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'error-gradient': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      },
      backgroundColor: {
        'card': 'rgba(255, 255, 255, 0.1)',
        'primary-bg': '#0a0a0a',
        'secondary-bg': '#1a1a1a',
      },
      borderColor: {
        'card': 'rgba(255, 255, 255, 0.2)',
      },
      borderRadius: {
        'card': '12px',
      },
      boxShadow: {
        'card': '0 8px 32px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
}
