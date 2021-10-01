import { useWeb3React } from "@web3-react/core";
import { providers } from "ethers";
import Card from "./common/Card";
import Button from "./common/Button";
import { InjectedConnector } from "@web3-react/injected-connector";
import NetworkIndicator from "./common/NetworkIndicator";

interface Props {
  confirm: () => void;
}

function ConnectNetwork({ confirm }: Props) {
  const { chainId, activate } = useWeb3React<providers.Web3Provider>();
  const injectedConnector = new InjectedConnector({});

  const connectButton = (
    <Button text="CONNECT WALLET" onClick={() => activate(injectedConnector)} />
  );

  const confirmBody = chainId && (
    <div className="flex flex-col gap-2">
      <div>
        Please confirm you're connected to the right network (or switch to the right one) before continuing.
      </div>
      <div className="flex justify-center"><NetworkIndicator chainId={chainId} /></div>
    </div>
  );

  const confirmButton = (
    <Button text="CONFIRM" onClick={confirm} />
  );

  return (
    <div className="flex justify-center items-center py-20">
      <div className="mx-3 w-3/4 max-w-4xl h-2/3 text-center">
        {
          chainId === undefined
            ? <Card
                header="CONNECT WALLET"
                body="Please connect your wallet to use the Truffle Browser Provider."
                footer={connectButton}
              />
            : <Card
                header="CONNECT WALLET"
                body={confirmBody}
                footer={confirmButton}
              />
        }
      </div>
    </div>
  );
}

export default ConnectNetwork;
