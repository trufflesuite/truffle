import { DEFAULT_THEME } from "@mantine/core";
import type {
  DefaultMantineColor,
  MantineThemeColorsOverride,
  Tuple
} from "@mantine/core";

export type TruffleColorPrefix = "truffle";
export type TruffleColor = "teal" | "brown";

export type ExtendedColor =
  | DefaultMantineColor
  | `${TruffleColorPrefix}-${TruffleColor}`;

declare module "@mantine/core" {
  export interface MantineThemeColorsOverride {
    colors: Record<ExtendedColor, Tuple<string, 10>>;
  }
}

const colors: MantineThemeColorsOverride["colors"] = {
  ...DEFAULT_THEME.colors,
  "truffle-teal": [
    "#d5f5ee",
    "#c5f1e7",
    "#b5ede1",
    "#a5e9da",
    "#94e5d3",
    "#84e1cd",
    "#74ddc6",
    "#4fd4b7",
    "#30c6a5",
    "#27a186"
  ],
  "truffle-brown": [
    "#a28a91",
    "#92767e",
    "#7f656d",
    "#6c565c",
    "#58464c",
    "#45373b",
    "#31272a",
    "#2c2325",
    "#261e21",
    "#211a1c"
  ]
};

export default colors;
