import type { MantineThemeOverride } from "@mantine/core";

import fontFamily from "./fontFamily";
import colors from "./colors";
import primaryColor from "./primaryColor";
import primaryShade from "./primaryShade";
import defaultRadius from "./defaultRadius";

const theme: MantineThemeOverride = {
  fontFamily,
  colors,
  primaryColor,
  primaryShade,
  defaultRadius
};

export default theme;
