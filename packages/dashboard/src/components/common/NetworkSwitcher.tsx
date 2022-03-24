import axios from "axios";
import { useEffect, useState } from "react";
import {
  forwardDashboardProviderRequest,
  getNetworkName
} from "src/utils/utils";
import { useConnect, useAccount } from "wagmi";

interface Props {
  chainId: number;
  dashboardChains?: object[];
}

function NetworkSwitcher({ chainId, dashboardChains }: Props) {
  const [networkName, setNetworkName] = useState<string>(`Chain ID ${chainId}`);
  const textColor = chainId === 1 ? "text-truffle-red" : "";
  const [{ data: accountData }] = useAccount();
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

  const postRpc = async (url: string, method: string, params: any[] = []) => {
    try {
      const { data } = await axios.post(url, {
        jsonrpc: "2.0",
        method,
        params,
        id: 0
      });
      console.log(`${method} result: ${JSON.stringify(data)}`);
      return data.result;
    } catch (e) {
      console.log(e);
    }
  };
  async function fundAccount(chain: any) {
    const rpcUrl = chain.rpcUrls[0];
    const clientVersion = await postRpc(rpcUrl, "web3_clientVersion");
    if (clientVersion.includes("Ganache")) {
      const funded = await postRpc(rpcUrl, "evm_setAccountBalance", [
        accountData?.address,
        "0x56BC75E2D63100000"
      ]); // give them 100 ETH for good measure
      if (!funded) {
        console.warn(
          `Something went wrong when funding account ${accountData?.address}`
        );
      }
    } else if (clientVersion.includes("HardhatNetwork")) {
      console.warn("Hardhat Network account funding not yet supported.");
    }
  }
  async function getVerifiedChainId(chain: any) {
    const result = await postRpc(chain.rpcUrls[0], "eth_chainId");
    return result;
  }

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
    if (!chain.chainId) {
      chain.chainId = await getVerifiedChainId(chain);
      if (!chain.chainId) {
        console.error(
          `Chain ${chain.chainName} does not have a valid chainId and the provided RPC URL is invalid.`
        );
        return;
      }
    }
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
      if (chain.isLocalChain) {
        await fundAccount(chain);
      }
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
