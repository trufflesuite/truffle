import { Global } from "@mantine/core";
import openSansSrc from "src/assets/open-sans-variable-wdth-wght.ttf";

const fonts = [
  {
    "@font-face": {
      fontFamily: "Open Sans",
      src: `url('${openSansSrc}') format('truetype')`,
      fontWeight: 400,
      fontStyle: "normal"
    }
  }
];

const truffleBgColorSelectors = [".mantine-AppShell-root"].join(", ");

const truffleOffBgColorSelectors = [
  ".mantine-Navbar-root",
  ".mantine-Paper-root"
].join(", ");

const watermelonHex = "#E86591";
const orangeHex = "#E4A663";
const orangeBrightHex = "#E78820";
const redHex = "#D60000";
const mintHex = "#3FE0C5";
const mintDarkHex = "#0FBEA1";
const greenHex = "#00D717";
const greenDarkHex = "#00A412";

function MantineGlobal(): JSX.Element {
  return (
    <Global
      styles={theme => {
        const { colors, colorScheme, white, fn } = theme;
        return [
          ...fonts,
          {
            [truffleBgColorSelectors]: {
              backgroundColor:
                colorScheme === "dark"
                  ? colors["truffle-brown"][7]
                  : colors["truffle-beige"][3]
            },
            [truffleOffBgColorSelectors]: {
              backgroundColor:
                colorScheme === "dark"
                  ? colors["truffle-brown"][8]
                  : colors["truffle-beige"][4]
            },
            [`${truffleBgColorSelectors}, ${truffleOffBgColorSelectors}`]: {
              transition: "background-color 0.1s"
            },
            // class for highlighting source material in debugger
            ".truffle-debugger-text-highlighted": {
              backgroundColor:
                colorScheme === "dark" ? "#4444aa60" : "#ffff0050"
            },

            ".truffle-debugger-input-and-button": {
              display: "flex",
              flexGrow: 1
            },
            ".truffle-debugger-input-and-button > div > input": {
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0,
              border: 0,
              height: 42,
              backgroundColor:
                theme.colorScheme === "dark"
                  ? theme.colors["truffle-brown"][5]
                  : "#FFFFFF"
            },

            ".trfl-Input-wrapper": {
              flexGrow: 1
            },
            ".mantine-Alert-icon": {
              "width": 28,
              "height": "auto",
              "> svg": {
                height: 28,
                width: 28
              }
            },
            ".mantine-Notification-root": {
              "backgroundColor":
                colorScheme === "dark" ? colors["dark"][4] : white,
              "padding": "1rem 1rem 1rem 2rem",
              ".mantine-Notification-title": {
                fontSize: 15
              }
            },
            ".mantine-Prism-code": {
              "backgroundColor":
                colorScheme === "dark"
                  ? `${fn.darken(colors["truffle-brown"][9], 0.1)} !important`
                  : `${colors["truffle-beige"][0]} !important`,
              ".mantine-Prism-lineNumber": {
                color:
                  colorScheme === "dark"
                    ? colors["truffle-brown"][5]
                    : colors["truffle-beige"][5]
              }
            },
            ".codec-components-code-bracket": {
              color: colors["truffle-beige"][8]
            },
            ".hljs-comment, .hljs-quote": {
              color:
                theme.colorScheme === "dark"
                  ? colors["truffle-beige"][8]
                  : colors["truffle-beige"][6],
              fontStyle: "italic"
            },
            ".hljs-keyword": {
              color: theme.colorScheme === "dark" ? mintHex : mintDarkHex,
              fontWeight: "bold"
            },
            ".hljs-subst": {
              color: colors.pink[7],
              fontWeight: "normal"
            },
            ".hljs-number": {
              color: redHex
            },
            ".hljs-string, .hljs-doctag": {
              color: theme.colorScheme === "dark" ? greenHex : greenDarkHex
            },
            [[
              ".hljs-type",
              ".hljs-class",
              ".hljs-title",
              ".hljs-section",
              ".hljs-selector-id",
              ".codec-components-code-name"
            ].join(", ")]: {
              color: theme.colorScheme === "dark" ? orangeHex : orangeBrightHex,
              fontWeight: "bold"
            },
            ".hljs-attribute": {
              color: colors["truffle-teal"][8],
              fontWeight: "normal"
            },
            ".hljs-literal, .hljs-built_in, .hljs-builtin-name": {
              color: watermelonHex
            }
          }
        ];
      }}
    />
  );
}

export default MantineGlobal;
