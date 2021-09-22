import { useEffect, useState } from "react";
import { getNetworkName } from "src/utils/utils";

interface Props {
  chainId: number;
}

function NetworkIndicator({ chainId }: Props) {
  const [networkName, setNetworkName] = useState<string>(`CHAIN ID ${chainId}`);
  const background = chainId === 1 ? 'bg-truffle-red' : 'bg-truffle-blue';

  useEffect(() => {
    const updateNetwork = async (chainId: number) => {
      const connectedNetworkName = await getNetworkName(chainId);
      setNetworkName(connectedNetworkName);
      console.log(connectedNetworkName);
    };

    if (!chainId) return;
    updateNetwork(chainId);
  }, [chainId]);

  return (
    <div className={`rounded p-2 ${background} text-truffle-brown`}>
      {networkName}
    </div>
  );
}

export default NetworkIndicator;
