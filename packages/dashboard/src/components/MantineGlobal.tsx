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
            ".trfl-AppShell-main": {
              width: "auto"
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
              height: 42
            },

            ".trfl-Input-wrapper": {
              flexGrow: 1
            },
            ".truffle-debugger-source:hover": {
              cursor: "pointer"
            },
            ".truffle-debugger-breakpoint-group": {
              display: "flex",
              marginBottom: 5
            },
            ".truffle-debugger-breakpoint-delete": {
              borderRadius: 25,
              backgroundColor: "#FA5252",
              width: 16,
              height: 16,
              marginRight: 16
            },
            ".truffle-debugger-breakpoint:hover": {
              cursor: "pointer"
            },
            ".truffle-debugger-breakpoint-delete:hover": {
              cursor: "pointer",
              backgroundColor: "red"
            },
            ".truffle-debugger-error": {
              width: "50%"
            },
            ".truffle-debugger-breakpoint-group": {
              display: "flex",
              justifyContent: "space-between"
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
            ".hljs-comment, .hljs-quote": {
              color: colors["truffle-beige"][8],
              fontStyle: "italic"
            },
            ".hljs-keyword, .hljs-selector-tag": {
              color: colors.pink[8],
              fontWeight: "bold"
            },
            ".hljs-subst": {
              color: colors.pink[7],
              fontWeight: "normal"
            },
            ".hljs-number, .hljs-literal, .hljs-variable, .hljs-template-variable, .hljs-tag, .hljs-attr":
              {
                color: colors.violet[7]
              },
            ".hljs-string, .hljs-doctag": {
              color: colors.orange[4]
            },
            ".hljs-title, .hljs-section, .hljs-selector-id": {
              color: colors["truffle-teal"][8],
              fontWeight: "bold"
            },
            ".hljs-type, .hljs-class, .hljs-title": {
              color: colors["truffle-teal"][8],
              fontWeight: "bold"
            },
            ".hljs-tag, .hljs-name, .hljs-attribute": {
              color: colors["truffle-teal"][8],
              fontWeight: "normal"
            },
            ".hljs-built_in, .hljs-builtin-name": {
              color: colors["truffle-teal"][8]
            }
          }
        ];
      }}
    />
  );
}

export default MantineGlobal;
