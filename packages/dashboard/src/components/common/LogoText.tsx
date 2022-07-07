import { Text } from "@mantine/core";
import type { MantineSize, MantineSizes } from "@mantine/core";

const logoTextSizes: MantineSizes = {
  xs: 14,
  sm: 18,
  md: 24,
  lg: 32,
  xl: 42
};

type LogoTextProps = {
  size?: MantineSize | number;
};

function LogoText({ size }: LogoTextProps): JSX.Element {
  if (typeof size !== "number") {
    size = logoTextSizes[size || "sm"];
  }

  return (
    <Text
      sx={{
        fontSize: size,
        userSelect: "none"
      }}
      weight={600}
    >
      {/* TODO: Just "DASHBOARD" on small window */}
      TRUFFLE DASHBOARD
    </Text>
  );
}

export default LogoText;
