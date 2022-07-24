import { useEffect } from "react";
import { ColorSchemeProvider } from "@mantine/core";
import type { ColorScheme } from "@mantine/core";
import { useColorScheme } from "@mantine/hooks";
import { useSavedColorScheme } from "src/hooks";

type ColorSchemeWrapperProps = {
  children: React.ReactNode;
};

function ColorSchemeWrapper({
  children
}: ColorSchemeWrapperProps): JSX.Element {
  // Color scheme
  // Priority: Local storage > system > light > dark
  const systemColorScheme = useColorScheme();
  const [colorScheme, setColorScheme] = useSavedColorScheme();
  const toggleColorScheme = (val?: ColorScheme) => {
    setColorScheme(val || (colorScheme === "light" ? "dark" : "light"));
  };
  useEffect(() => {
    if (!colorScheme && systemColorScheme === "dark") {
      setColorScheme("dark");
    }
  }, [systemColorScheme, colorScheme, setColorScheme]);

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
