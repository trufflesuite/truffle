import { Divider as MantineDivider, useMantineTheme } from "@mantine/core";

function Divider(): JSX.Element {
  const { colors, colorScheme, fn } = useMantineTheme();

  return (
    <MantineDivider
      color={
        colorScheme === "dark"
          ? fn.lighten(colors["truffle-brown"][8], 0.08)
          : fn.darken(colors["truffle-beige"][4], 0.08)
      }
    />
  );
}

export default Divider;
