import { Image } from "@mantine/core";
import type { ImageProps } from "@mantine/core";

import ethereum from "src/assets/icons/ethereum.png";
import ropsten from "src/assets/icons/ropsten.png";
import kovan from "src/assets/icons/kovan.png";
import rinkeby from "src/assets/icons/rinkeby.png";
import goerli from "src/assets/icons/goerli.png";
import ganache from "src/assets/icons/ganache.png";
import unknownChain from "src/assets/icons/unknown-chain.png";
import waitingChain from "src/assets/icons/waiting-chain.png";

const chainIDtoImgSrc = {
  "-1": waitingChain,
  1: ethereum,
  3: ropsten,
  4: rinkeby,
  5: goerli,
  42: kovan,
  1337: ganache
};

interface ChainIconProps extends ImageProps {
  chainID: number;
}

function ChainIcon({ chainID, ...args }: ChainIconProps): JSX.Element {
  const imgSrc =
    chainIDtoImgSrc[chainID as keyof typeof chainIDtoImgSrc] || unknownChain;

  return <Image src={imgSrc} alt="Chain image" {...args} />;
}

export default ChainIcon;
