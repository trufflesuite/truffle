import NetworkIndicator from "../Network/NetworkIndicator";
import { useNetwork} from "wagmi";
import WalletModal from "src/components/Modal/WalletModal";

interface Props {
  disconnect: () => void;
}

function Header({ disconnect }: Props) {
  const [{data: networkData}] = useNetwork();
  return (
    <header className={"w-full grid grid-cols-2 py-2 px-4 border-b-2 border-truffle-light text-md uppercase"}>
      <div className={"flex justify-start items-center"}>
        <span className={"inline-flex items-center gap-3"}>
          <img src={"/truffle-logomark.svg"} width="32px" alt="Truffle Logo" />
          Truffle Dashboard
        </span>
      </div>
      <div className={"flex justify-end items-center gap-4 text-md"}>
        {networkData.chain?.id && <NetworkIndicator chainId={networkData.chain.id}/>}
        <WalletModal onDisconnect={disconnect}/>
      </div>
    </header>
  );
}

export default Header;
