import { providers } from "ethers";
import { useEffect, useState } from "react";
import { getDisplayName } from "src/utils/utils";
import NetworkIndicator from "src/components/common/NetworkIndicator";
import { useAccount, useConnect, useNetwork } from "wagmi";
import Button from "../common/Button";

interface Props {
  disconnect: () => void;
}

function Header({ disconnect }: Props) {
  const [displayName, setDisplayName] = useState<string>();

  const [{ data: accountData }] = useAccount();
  const [{ data: networkData }] = useNetwork();
  const [{ data: connectData }] = useConnect();

  useEffect(() => {
    const updateAccountDisplay = async (
      provider: providers.Web3Provider,
      address: string
    ) => {
      setDisplayName(await getDisplayName(provider, address));
    };

    if (!connectData.connected) {
      setDisplayName(undefined);
    }

    if (!connectData || !accountData) return;
    updateAccountDisplay(
      connectData.connector?.getProvider(),
      accountData.address
    );
  }, [connectData, accountData]);

  return (
    <header className="grid grid-cols-2 py-2 px-4 border-b-2 border-truffle-light text-md uppercase">
      <div className="flex justify-start items-center">
        <span className="inline-flex items-center gap-3">
          <img src={"/truffle-logomark.svg"} width="32px" alt="Truffle Logo" />
          Truffle Dashboard
        </span>
      </div>
      <div className="flex justify-end items-center gap-4 text-md">
        {networkData.chain?.id && (
          <NetworkIndicator chainId={networkData.chain.id} />
        )}
        {networkData.chain?.id && (
          <Button onClick={disconnect} size={"sm"} color={"red"}>
            disconnect
          </Button>
        )}
        <div>{displayName}</div>
      </div>
    </header>
  );
}

export default Header;
