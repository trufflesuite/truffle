import { Title, Text, createStyles } from "@mantine/core";
import type { MantineSize, MantineSizes } from "@mantine/core";

const useStyles = createStyles((_theme, _params, _getRef) => ({
  logoText: {
    fontWeight: 600,
    userSelect: "none"
  },
  logoTextFlair: {
    fontWeight: 400,
    fontFamily: "'Pacifico', cursive"
  }
}));

const logoTextSizes: MantineSizes = {
  xs: 18,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 42
};

type LogoTextProps = {
  size?: MantineSize | number;
};

function LogoText({ size }: LogoTextProps): JSX.Element {
  const { classes } = useStyles();

  if (typeof size !== "number") {
    size = logoTextSizes[size || "sm"];
  }

  return (
    <Title order={1} className={classes.logoText} sx={{ fontSize: size }}>
      {/* TODO: Just "Dashboard" when window small */}
      TRUFFLE&nbsp;
      <Text
        inherit
        component="span"
        color="dimmed"
        className={classes.logoTextFlair}
        sx={{ fontSize: size * 0.9 }}
      >
        Dashboard
      </Text>
    </Title>
  );
}

export default LogoText;
