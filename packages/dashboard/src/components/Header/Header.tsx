import Button from "../common/Button";

interface Props {
  provider: any;
  connectWeb3: () => void;
}

function Header({ provider, connectWeb3 }: Props) {
  return (
    <header className="grid grid-cols-2 py-2 px-4 border-b-2 border-truffle-light">
      <div className="flex justify-start items-center">
        <span className="inline-flex items-center gap-3 text-md">
          <img src="/truffle-logomark.svg" width="32px" />
          TRUFFLE DASHBOARD
        </span>
      </div>
      <div className="flex justify-end items-center">
        <Button onClick={connectWeb3} text={provider ? 'WALLET CONNECTED' : 'CONNECT WALLET'} />
      </div>
    </header>
  );
}

export default Header;
