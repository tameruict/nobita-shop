/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#257bf4",
        "background-light": "#f5f7f8",
        "background-dark": "#0a0c10",
        "neon-purple": "#bc13fe",
        "neon-cyan": "#00f3ff",
      },
      fontFamily: {
        "display": ["Iosevka Charon Mono", "monospace"],
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
    },
  },
  plugins: [],
}
