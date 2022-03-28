module.exports = {
  // important: '#__next',
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
        "truffle-lighter": "#f8f5f0",
        // test
        "dark-pink": "#221825",
        "dark-blue": "#0F182A",
        "dark-1000": "#0D0415",
        "dark-900": "#161522",
        "dark-850": "#1d1e2c",
        "dark-800": "#202231",
        "dark-700": "#2E3348",
        "dark-600": "#414A6C",
        "dark-500": "#223D5E",
        "dark-400": "#545f7b",
        "low-emphasis": "#575757",
        "primary": "#BFBFBF",
        "secondary": "#7F7F7F",
        "high-emphasis": "#E3E3E3",
        "higher-emphasis": "#FCFCFD"
      }
    }
    // animation: {
    //   "ellipsis": "ellipsis 1.25s infinite",
    //   "spin-slow": "spin 2s linear infinite",
    //   "fade": "opacity 150ms linear"
    // },
    // keyframes: {
    //   ellipsis: {
    //     "0%": { content: '"."' },
    //     "33%": { content: '".."' },
    //     "66%": { content: '"..."' }
    //   },
    //   opacity: {
    //     "0%": { opacity: 0 },
    //     "100%": { opacity: 100 }
    //   }
    // }
  },
  variants: {
    extend: {}
  },
  plugins: []
};
