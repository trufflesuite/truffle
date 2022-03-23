import { useWeb3React } from "@web3-react/core";
import { providers } from "ethers";
import { useEffect, useState } from "react";
import { getDisplayName } from "../../utils/utils";
import Dropdown from "../common/Dropdown";
import NetworkIndicator from "../common/NetworkIndicator";
import NetworkSwitcher from "../common/NetworkSwitcher";

interface Props {
  publicChains: object[];
}

function Header({ publicChains }: Props) {
  const [displayName, setDisplayName] = useState<string>();
  const { account, library, chainId } = useWeb3React<providers.Web3Provider>();
  const networkSwitchingSupported = true;
  console.log(useWeb3React());

  useEffect(() => {
    const updateAccountDisplay = async (
      library: providers.Web3Provider,
      account: string
    ) => {
      setDisplayName(await getDisplayName(library, account));
    };

    if (!library || !account) return;
    updateAccountDisplay(library, account);
  }, [library, account]);

  return (
    <header className="grid grid-cols-2 py-2 px-4 border-b-2 border-truffle-light text-md uppercase">
      <div className="flex justify-start items-center">
        <span className="inline-flex items-center gap-3">
          <img src="/truffle-logomark.svg" width="32px" />
          Truffle Dashboard
        </span>
      </div>
      <div className="flex justify-end items-center gap-4 text-md">
        {chainId &&
          (networkSwitchingSupported ? (
            <NetworkSwitcher chainId={chainId} publicChains={publicChains} />
          ) : (
            <NetworkIndicator chainId={chainId} />
          ))}
        <div>{displayName}</div>
        <Dropdown networkOne="Hello" networkTwo="hola" networkThree="Yo"></Dropdown>
      </div>
    </header>
  );
}

export default Header;
