/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#06080F",
          card: "#0F172A",
          cardHover: "#1F2937",
          primary: "#00FF9D",
          secondary: "#00F0FF",
          danger: "#FF007F",
          warning: "#FFB800",
          muted: "#9CA3AF",
          darkBorder: "#1F293D",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["Fira Code", "JetBrains Mono", "monospace"],
      },
      animation: {
        "pulse-glow": "pulseGlow 2.5s infinite ease-in-out",
        "scan-line": "scanLine 3s linear infinite",
        float: "float 4s ease-in-out infinite",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 15px rgba(0, 229, 168, 0.25)" },
          "50%": { boxShadow: "0 0 35px rgba(0, 229, 168, 0.55)" },
        },
        scanLine: {
          "0%": { top: "0%" },
          "100%": { top: "100%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
};
