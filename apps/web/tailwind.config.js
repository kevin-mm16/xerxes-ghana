/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f5f3ed",
        ink: "#172021",
        muted: "#606e68",
        faint: "#89948e",
        line: "#d9ddd6",
        forest: {
          50: "#e6eee8",
          600: "#346c55",
          800: "#254d3e",
          900: "#172021",
        },
        earth: "#7e7052",
        gold: "#a99977",
        graphite: "#172021",
        alert: "#a03e34",
        warning: "#ad8237",
        high: "#d9662a",
      },
      boxShadow: {
        card: "0 1px 3px rgba(16, 30, 23, 0.04)",
        lift: "0 6px 24px rgba(16, 30, 23, 0.12)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
