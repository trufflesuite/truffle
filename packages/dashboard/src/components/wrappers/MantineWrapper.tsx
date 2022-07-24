import { MantineProvider } from "@mantine/core";
import { useSavedColorScheme } from "src/hooks";
import theme from "src/utils/theme";
import { EMOTION_KEY } from "src/utils/constants";

type MantineWrapperProps = {
  children: React.ReactNode;
};

function MantineWrapper({ children }: MantineWrapperProps): JSX.Element {
  const [colorScheme] = useSavedColorScheme();

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
