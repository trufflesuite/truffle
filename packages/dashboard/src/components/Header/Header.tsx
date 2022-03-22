import { providers } from "ethers";
import { useEffect, useState } from "react";
import { getDisplayName } from "../../utils/utils";
import NetworkIndicator from "../common/NetworkIndicator";
import {useAccount, useNetwork, useProvider} from "wagmi";

interface Props {}

function Header({}: Props) {
  const [displayName, setDisplayName] = useState<string>();
  // const { account, library, chainId } = useWeb3React<providers.Web3Provider>();

  const [{ data: accountData}] = useAccount();
  const [{ data: networkData }] = useNetwork();
  const provider = useProvider();


  useEffect(() => {
    const updateAccountDisplay = async (
      provider: providers.BaseProvider,
      address: string
    ) => {
      setDisplayName(await getDisplayName(provider, address));
    };

    if (!provider || !accountData) return;
    updateAccountDisplay(provider, accountData.address);
  }, [provider, accountData]);

  return (
    <header className="grid grid-cols-2 py-2 px-4 border-b-2 border-truffle-light text-md uppercase">
      <div className="flex justify-start items-center">
        <span className="inline-flex items-center gap-3">
          <img src="/truffle-logomark.svg" width="32px" alt={'Truffle Logo'}/>
          Truffle Dashboard
        </span>
      </div>
      <div className="flex justify-end items-center gap-4 text-md">
        {networkData.chain?.id && <NetworkIndicator chainId={networkData.chain.id} />}
        <div>{displayName}</div>
      </div>
    </header>
  );
}

export default Header;
