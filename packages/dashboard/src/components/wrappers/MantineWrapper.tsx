import { MantineProvider, createEmotionCache } from "@mantine/core";
import { useSavedColorScheme } from "src/hooks";
import theme from "src/utils/theme";
import { EMOTION_KEY } from "src/utils/constants";

const emotionCache = createEmotionCache({ key: EMOTION_KEY });

type MantineWrapperProps = {
  children: React.ReactNode;
};

function MantineWrapper({ children }: MantineWrapperProps): JSX.Element {
  const [colorScheme] = useSavedColorScheme();

  return (
    <MantineProvider
      theme={{ colorScheme, ...theme }}
      emotionCache={emotionCache}
      withGlobalStyles
      withNormalizeCSS
    >
      {children}
    </MantineProvider>
  );
}

export default MantineWrapper;
