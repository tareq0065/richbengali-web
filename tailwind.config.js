const { heroui } = require("@heroui/theme");
/** @type {import('tailwindcss').Config} */

module.exports = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
        },
        shine: {
          "0%": {
            opacity: "0",
            transform: "translateX(0%) skewX(-20deg)",
          },
          "20%": {
            opacity: "1",
          },
          "60%": {
            opacity: "0.6",
          },
          "100%": {
            opacity: "0",
            transform: "translateX(200%) skewX(-20deg)",
          },
        },
      },
      animation: {
        breathe: "breathe 2.4s ease-in-out infinite",
        shine: "shine 2s ease-in-out infinite",
      },
    },
  },
  darkMode: "class",
  plugins: [heroui()],
};
