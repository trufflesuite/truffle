module.exports = {
  purge: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  darkMode: false, // or 'media' or 'class'
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
