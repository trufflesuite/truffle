import { MantineProvider } from "@mantine/core";
import type { ColorScheme } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import theme from "src/utils/theme";
import { COLOR_SCHEME_KEY, EMOTION_KEY } from "src/utils/constants";

type MantineWrapperProps = {
  children: React.ReactNode;
};

function MantineWrapper({ children }: MantineWrapperProps): JSX.Element {
  const [colorScheme] = useLocalStorage<ColorScheme>({
    key: COLOR_SCHEME_KEY
  });

  return (
    <MantineProvider
      theme={{ colorScheme, ...theme }}
      emotionOptions={{ key: EMOTION_KEY }}
      withGlobalStyles
      withNormalizeCSS
    >
      {children}
    </MantineProvider>
  );
}

export default MantineWrapper;
