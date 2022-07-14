import { Global } from "@mantine/core";
import openSansSrc from "src/assets/open-sans-variable-wdth-wght.ttf";
import pacificoSrc from "src/assets/pacifico-regular.ttf";

function MantineGlobal(): JSX.Element {
  return (
    <Global
      styles={[
        {
          "@font-face": {
            fontFamily: "Open Sans",
            src: `url('${openSansSrc}') format('truetype')`,
            fontWeight: 400,
            fontStyle: "normal"
          }
        },
        {
          "@font-face": {
            fontFamily: "Pacifico",
            src: `url('${pacificoSrc}') format('truetype')`,
            fontWeight: 400,
            fontStyle: "normal"
          }
        }
      ]}
    />
  );
}

export default MantineGlobal;
