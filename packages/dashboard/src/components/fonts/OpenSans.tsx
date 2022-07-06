import { Global } from "@mantine/core";
import openSansFont from "src/assets/open-sans-variable-wdth-wght.ttf";

function OpenSans(): JSX.Element {
  return (
    <Global
      styles={{
        "@font-face": {
          fontFamily: "Open Sans",
          src: `url('${openSansFont}') format('truetype')`
        }
      }}
    />
  );
}

export default OpenSans;
