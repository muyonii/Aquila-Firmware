/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#f2f6f9',
        surface: '#ffffff',
        line: '#dde6ec',
        ink: {
          DEFAULT: '#0f1f2b',
          muted: '#4a5b67',
        },
        brand: {
          DEFAULT: '#0c4a6e',
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
          800: '#075985',
          900: '#0c4a6e',
        },
        chart: {
          1: '#bcd8e6',
          2: '#7fb3cc',
          3: '#3b82a6',
          4: '#0c4a6e',
        },
      },
      borderRadius: {
        'control': '12px',
        'tile': '12px',
        'card': '16px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15,31,43,.04), 0 4px 12px rgba(15,31,43,.04)',
      },
    },
  },
  plugins: [],
};
