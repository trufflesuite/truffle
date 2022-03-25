import { useEffect, useState } from "react";
import {
  createRpcPayload,
  forwardDashboardProviderRequest,
  getNetworkName,
  postRpc
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
      let connectedNetworkName = "";
      const chainIdHex = `0x${chainId.toString(16)}`;
      await dashboardChains?.forEach(async (chain: any) => {
        if (!chain.chainId) {
          chain.chainId = await postRpc(chain.rpcUrls[0], "eth_chainId");
        }
        if (chain.chainId === chainIdHex) {
          connectedNetworkName = chain.chainName;
        }
      });
      if (!connectedNetworkName) {
        connectedNetworkName = await getNetworkName(chainId);
      }
      setNetworkName(connectedNetworkName);
      console.log(connectedNetworkName);
    };

    if (!chainId) return;
    updateNetwork(chainId);
  }, [chainId, dashboardChains]);

  /**
   * Attempts to fund the wallet's connected address on the supplied chain.
   * @param chain The chain on which to fund the account.
   */
  async function fundAccount(chain: any) {
    const rpcUrl = chain.rpcUrls[0];
    // get the rpc url's client version to determine what rpc method to use
    // to fund the account
    const clientVersion = await postRpc(rpcUrl, "web3_clientVersion");
    let method = "";
    // as of now both rpc methods use the same params, but that could potentially
    // change and also let's give hardhat users less eth just for fun :)
    let params = [];
    if (clientVersion.includes("Ganache")) {
      method = "evm_setAccountBalance";
      params.push(accountData?.address);
      params.push("0x56BC75E2D63100000");
    } else if (clientVersion.includes("HardhatNetwork")) {
      method = "hardhat_setBalance";
      params.push(accountData?.address);
      params.push("0x2B5E3AF16B1880000");
    } else {
      // TODO: display error to user
      console.error(`Account funding for ${clientVersion} not yet supported.`);
      return;
    }

    const funded = await postRpc(rpcUrl, method, params);
    if (!funded) {
      // TODO: display error to user
      console.error(
        `Something went wrong when funding account ${accountData?.address}`
      );
    }
  }

  /**
   * Attempts to add the chain to a wallet.
   * @param chain Chain to add to wallet.
   */
  async function addNetwork(chain: any) {
    if (!provider) return; // TODO: handle better
    // wallets are very strict about what properties are on the chain data you
    // send. `isLocalProvider` needs to be removed because they aren't expecting it
    const clone = JSON.parse(JSON.stringify(chain));
    delete clone.isLocalChain;
    const addNetworkPayload = createRpcPayload("wallet_addEthereumChain", [
      { ...clone }
    ]);
    const addNetworkResponse = await forwardDashboardProviderRequest(
      provider,
      connector,
      addNetworkPayload
    );
    if (addNetworkResponse.error) {
      // TODO: display error to user
      console.error(
        `Error adding network: ${JSON.stringify(addNetworkResponse.error)}`
      );
    }
  }

  /**
   * Switches the wallet's connected chain if the chain is added to the
   * wallet. Attempts to add the chain if not.
   * @param chain Chain to switch to or add to wallet.
   * @dev We don't need to propagate the state change back up the chain when the
   * network changes. The chainId is imported from wagmi, which will detect the
   * wallet change an rerender dependent components.
   */
  async function setOrAddNetwork(chain: any) {
    if (!provider) return; // TODO: handle better

    // we need a chainId to switch networks, so request from rpcUrl of chain
    // if it isn't available.
    if (!chain.chainId) {
      chain.chainId = await postRpc(chain.rpcUrls[0], "eth_chainId");
      if (!chain.chainId) {
        // TODO: display error to user
        console.error(
          `Chain ${chain.chainName} does not have a valid chainId and the provided RPC URL is invalid.`
        );
        return;
      }
    }

    const switchNetworkPayload = createRpcPayload(
      "wallet_switchEthereumChain",
      [{ chainId: chain.chainId }]
    );
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
        // TODO: display error to user
        console.error(
          `Error switching networks : ${switchNetworkResponse.error}`
        );
      }
    } else {
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
