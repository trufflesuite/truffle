import type { ColorScheme } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { COLOR_SCHEME_KEY } from "src/utils/constants";

const useSavedColorScheme = () =>
  useLocalStorage<ColorScheme>({
    key: COLOR_SCHEME_KEY
  });

export default useSavedColorScheme;
