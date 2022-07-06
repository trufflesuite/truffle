import { useEffect } from "react";
import { EMOTION_KEY, COLOR_SCHEME_KEY } from "src/utils/constants";
// Mantine
import { MantineProvider, ColorSchemeProvider } from "@mantine/core";
import type { ColorScheme } from "@mantine/core";
import { useColorScheme, useLocalStorage } from "@mantine/hooks";
import theme from "src/utils/theme";
// Router
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// Components
import Layout from "src/components/Layout";
import Txs from "src/components/Txs";
import Contracts from "src/components/Contracts";
import OpenSans from "src/components/fonts/OpenSans";
import Palette from "src/components/Palette";

function App(): JSX.Element {
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
    <div id="app">
      <ColorSchemeProvider
        colorScheme={colorScheme}
        toggleColorScheme={toggleColorScheme}
      >
        <OpenSans />
        <MantineProvider
          theme={{ colorScheme, ...theme }}
          emotionOptions={{ key: EMOTION_KEY }}
          withGlobalStyles
          withNormalizeCSS
        >
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/txs" replace />} />
                <Route path="txs" element={<Txs />} />
                <Route path="contracts" element={<Contracts />} />
              </Route>
              <Route path="colors" element={<Palette />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </MantineProvider>
      </ColorSchemeProvider>
    </div>
  );
}

export default App;
