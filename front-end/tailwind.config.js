/** @type {import('tailwindcss').Config} */
import daisyui from "daisyui"

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Sora", "system-ui", "sans-serif"],
        display: ["\"Space Grotesk\"", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 35px rgba(37, 99, 235, 0.35)",
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: ["light", "dark", "cupcake", "emerald", "corporate", "synthwave"],
  },
}
