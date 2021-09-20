import { useWeb3React } from "@web3-react/core";
import { InjectedConnector } from "@web3-react/injected-connector";
import { providers } from "ethers";
import Button from "../common/Button";

interface Props {}

function Header({}: Props) {
  const { account, activate } = useWeb3React<providers.Web3Provider>();
  const injectedConnector = new InjectedConnector({});

  return (
    <header className="grid grid-cols-2 py-2 px-4 border-b-2 border-truffle-light">
      <div className="flex justify-start items-center">
        <span className="inline-flex items-center gap-3 text-md">
          <img src="/truffle-logomark.svg" width="32px" />
          TRUFFLE DASHBOARD
        </span>
      </div>
      <div className="flex justify-end items-center">
        <Button onClick={() => activate(injectedConnector)} text={account ? 'WALLET CONNECTED' : 'CONNECT WALLET'} />
      </div>
    </header>
  );
}

export default Header;
