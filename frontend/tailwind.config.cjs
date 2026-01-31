module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cyber: {
          blue: '#00D9FF',
          dark: '#0A1628',
          darker: '#050B14',
          glow: '#00B8D4',
        },
      },
      boxShadow: {
        'cyber': '0 0 20px rgba(0, 217, 255, 0.5)',
        'cyber-lg': '0 0 40px rgba(0, 217, 255, 0.6)',
      },
    },
  },
  plugins: [],
}
