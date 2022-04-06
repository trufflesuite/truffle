module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: "media",
  theme: {
    extend: {
      fontFamily: {
        oswald: ["Oswald"]
      },
      colors: {
        "truffle-blue": "#3fe0c5",
        "truffle-red": "#F2545B",
        "truffle-brown": "#5e464d",
        "truffle-light": "#efe5dc",
        "truffle-lighter": "#f8f5f0"
      }
    }
  },
  variants: {
    extend: {}
  },
  plugins: []
};
