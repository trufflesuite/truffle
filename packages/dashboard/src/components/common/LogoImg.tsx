import { Image } from "@mantine/core";
import type { MantineSize, MantineSizes } from "@mantine/core";
import imgSrc from "src/assets/logo.svg";

const logoImgSizes: MantineSizes = {
  xs: 30,
  sm: 42,
  md: 58,
  lg: 78,
  xl: 102
};

type LogoImgProps = {
  size?: MantineSize | number;
};

function LogoImg({ size }: LogoImgProps): JSX.Element {
  if (typeof size !== "number") {
    size = logoImgSizes[size || "sm"];
  }

  return <Image src={imgSrc} alt="Truffle logo" width={size} height={size} />;
}

export default LogoImg;
