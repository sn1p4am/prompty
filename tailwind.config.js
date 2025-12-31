/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "0",
      screens: {
        "2xl": "100%",
      },
    },
    extend: {
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "VT323", "monospace"],
        sans: ["JetBrains Mono", "Fira Code", "VT323", "monospace"], // Override sans to mono
      },
      colors: {
        border: "#1f521f", // Dim green
        input: "#1f521f",
        ring: "#33ff00",
        background: "#0a0a0a", // Deep black
        foreground: "#33ff00", // Terminal Green
        primary: {
          DEFAULT: "#33ff00",
          foreground: "#000000",
        },
        secondary: {
          DEFAULT: "#ffb000", // Amber
          foreground: "#000000",
        },
        destructive: {
          DEFAULT: "#ff3333", // Bright Red
          foreground: "#000000",
        },
        muted: {
          DEFAULT: "#1f521f",
          foreground: "#33ff00", // Keep it readable
        },
        accent: {
          DEFAULT: "#33ff00",
          foreground: "#000000",
        },
        card: {
          DEFAULT: "#000000",
          foreground: "#33ff00",
        },
      },
      borderRadius: {
        lg: "0px",
        md: "0px",
        sm: "0px",
      },
      boxShadow: {
        'glow': '0 0 10px rgba(51, 255, 0, 0.3)',
      },
      animation: {
        'blink': 'blink 1s step-end infinite',
        'scan': 'scan 8s linear infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        scan: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '0 100%' },
        }
      }
    },
  },
  plugins: [],
}
