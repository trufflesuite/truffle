import { useEffect, useState } from "react";
import { getNetworkName } from "src/utils/utils";

interface Props {
  chainId: number;
}

function NetworkIndicator({ chainId }: Props) {
  const [networkName, setNetworkName] = useState<string>(`Chain ID ${chainId}`);
  const textColor = chainId === 1 ? "text-truffle-red" : "";

  useEffect(() => {
    const updateNetwork = async (chainId: number) => {
      const connectedNetworkName = await getNetworkName(chainId);
      setNetworkName(connectedNetworkName);
      console.log(connectedNetworkName);
    };

    if (!chainId) return;
    updateNetwork(chainId);
  }, [chainId]);

  return <div className={`rounded uppercase ${textColor}`}>{networkName}</div>;
}

export default NetworkIndicator;
