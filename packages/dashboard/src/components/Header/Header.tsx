import { useWeb3React } from "@web3-react/core";
import { InjectedConnector } from "@web3-react/injected-connector";
import { providers } from "ethers";
import { useEffect } from "react";
import { useState } from "react";
import { getDisplayName } from "../../utils/utils";
import Button from "../common/Button";
import NetworkIndicator from "./NetworkIndicator";

interface Props {}

function Header({}: Props) {
  const [displayName, setDisplayName] = useState<string>();

  const { account, activate, library, chainId } = useWeb3React<providers.Web3Provider>();
  const injectedConnector = new InjectedConnector({});

  useEffect(() => {
    const updateAccountDisplay = async (library: providers.Web3Provider, account: string) => {
      setDisplayName(await getDisplayName(library, account));
    };

    if (!library || !account) return;
    updateAccountDisplay(library, account);
  }, [library, account]);

  return (
    <header className="grid grid-cols-2 py-2 px-4 border-b-2 border-truffle-light">
      <div className="flex justify-start items-center">
        <span className="inline-flex items-center gap-3 text-md">
          <img src="/truffle-logomark.svg" width="32px" />
          TRUFFLE DASHBOARD
        </span>
      </div>
      <div className="flex justify-end items-center gap-2">
        {chainId && <NetworkIndicator chainId={chainId} />}
        <Button onClick={() => activate(injectedConnector)} text={displayName ?? 'CONNECT WALLET'} />
      </div>
    </header>
  );
}

export default Header;
