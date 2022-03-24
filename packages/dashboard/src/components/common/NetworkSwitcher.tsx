import { useEffect, useState } from "react";
import {
  forwardDashboardProviderRequest,
  getNetworkName
} from "src/utils/utils";
import { useConnect } from "wagmi";

interface Props {
  chainId: number;
  dashboardChains?: object[];
}

function NetworkSwitcher({ chainId, dashboardChains }: Props) {
  const [networkName, setNetworkName] = useState<string>(`Chain ID ${chainId}`);
  const textColor = chainId === 1 ? "text-truffle-red" : "";
  const [{ data: connectData }] = useConnect();
  const provider = connectData.connector?.getProvider();
  const connector = connectData.connector;

  useEffect(() => {
    const updateNetwork = async (chainId: number) => {
      const connectedNetworkName = await getNetworkName(chainId);
      setNetworkName(connectedNetworkName);
      console.log(connectedNetworkName);
    };

    if (!chainId) return;
    updateNetwork(chainId);
  }, [chainId, dashboardChains]);

  async function addNetwork(chain: any) {
    if (!provider) return; // TODO: handle better
    const addNetworkPayload = {
      jsonrpc: "2.0",
      method: "wallet_addEthereumChain",
      params: [{ ...chain }],
      id: 0
    };
    const addNetworkResponse = await forwardDashboardProviderRequest(
      provider,
      connector,
      addNetworkPayload
    );
    if (addNetworkResponse.error) {
      console.error(
        "add network error: " + JSON.stringify(addNetworkResponse.error)
      );
    }
  }

  async function setOrAddNetwork(chain: any) {
    if (!provider) return; // TODO: handle better
    const switchNetworkPayload = {
      jsonrpc: "2.0",
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chain.chainId }],
      id: 0
    };
    console.log(switchNetworkPayload);
    const switchNetworkResponse = await forwardDashboardProviderRequest(
      provider,
      connector,
      switchNetworkPayload
    );
    if (switchNetworkResponse.error) {
      // MetaMask's error for the network not being added to MetaMask
      if (switchNetworkResponse.error.code === 4902) {
        addNetwork(chain);
      } else {
        // handle other errors
        console.error(
          "some other switch network error: " + switchNetworkResponse.error
        );
      }
    } else {
      // we actually don't need to propagate this state change back up the chain
      // when the provider request to switch networks is fulfilled, the chainId
      // imported from web3React will be changed, which will call the useEffect
      // for all components that are dependent on that chainId
      console.log("switched network! " + JSON.stringify(switchNetworkResponse));
    }
  }
  const chainIdHex = `0x${chainId.toString(16)}`;
  const chainOptions = dashboardChains ? (
    dashboardChains.map((chain: any) => {
      return (
        <div
          key={chain.chainId}
          className={`rounded uppercase ${textColor}`}
          onClick={() => setOrAddNetwork(chain)}
        >
          {(chain.chainId === chainIdHex ? "Selected: " : "") + chain.chainName}
        </div>
      );
    })
  ) : (
    <div className={`rounded uppercase ${textColor}`}>{networkName}</div>
  );
  return <div>{chainOptions}</div>;
}

export default NetworkSwitcher;
