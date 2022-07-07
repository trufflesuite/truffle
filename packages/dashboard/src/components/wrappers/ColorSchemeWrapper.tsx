import { useEffect } from "react";
import { ColorSchemeProvider } from "@mantine/core";
import type { ColorScheme } from "@mantine/core";
import { useColorScheme, useLocalStorage } from "@mantine/hooks";
import { COLOR_SCHEME_KEY } from "src/utils/constants";

type ColorSchemeWrapperProps = {
  children: React.ReactNode;
};

function ColorSchemeWrapper({
  children
}: ColorSchemeWrapperProps): JSX.Element {
  // Color scheme
  // Priority: Local storage > system > light > dark
  const preferredColorScheme = useColorScheme();
  const [colorScheme, setColorScheme] = useLocalStorage<ColorScheme>({
    key: COLOR_SCHEME_KEY
  });
  const toggleColorScheme = (val?: ColorScheme) => {
    setColorScheme(val || (colorScheme === "light" ? "dark" : "light"));
  };
  useEffect(() => {
    if (!colorScheme && preferredColorScheme === "dark") {
      setColorScheme("dark");
    }
  }, [preferredColorScheme, colorScheme, setColorScheme]);

  return (
    <ColorSchemeProvider
      colorScheme={colorScheme}
      toggleColorScheme={toggleColorScheme}
    >
      {children}
    </ColorSchemeProvider>
  );
}

export default ColorSchemeWrapper;
