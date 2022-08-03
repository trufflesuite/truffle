import { ColorSchemeProvider } from "@mantine/core";
import { useColorScheme } from "@mantine/hooks";
import { useSavedColorScheme } from "src/hooks";

type ColorSchemeWrapperProps = {
  children: React.ReactNode;
};

function ColorSchemeWrapper({
  children
}: ColorSchemeWrapperProps): JSX.Element {
  // Priority:
  // 1. Local storage (if defined)
  // 2. System (if detected)
  // 3. Light
  const systemColorScheme = useColorScheme();
  const [colorScheme, setColorScheme] = useSavedColorScheme();
  const toggleColorScheme = () => {
    setColorScheme(
      (colorScheme ?? systemColorScheme) === "dark" ? "light" : "dark"
    );
  };

  return (
    <ColorSchemeProvider
      colorScheme={colorScheme ?? systemColorScheme}
      toggleColorScheme={toggleColorScheme}
    >
      {children}
    </ColorSchemeProvider>
  );
}

export default ColorSchemeWrapper;
