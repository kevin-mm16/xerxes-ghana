/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f3f6f1",
        ink: "#16241d",
        muted: "#5c6b62",
        faint: "#8a978d",
        line: "#e3e8e1",
        forest: {
          50: "#e7f1ea",
          600: "#17663f",
          800: "#0f3d27",
          900: "#0b2f20",
        },
        earth: "#7c5a3a",
        alert: "#c0342a",
        warning: "#c9922a",
        high: "#d9662a",
      },
      boxShadow: {
        card: "0 10px 26px rgba(16, 40, 28, 0.06)",
        lift: "0 22px 50px rgba(16, 40, 28, 0.18)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
