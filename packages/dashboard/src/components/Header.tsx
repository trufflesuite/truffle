interface Props {
  provider: any;
  connectWeb3: () => void;
}

function Header({ provider, connectWeb3 }: Props) {
  return (
    <header className="flex justify-start p-2 gap-2">
      <div>
        Truffle Dashboard
      </div>
      {!provider && <button onClick={connectWeb3}>Connect Web3</button>}
    </header>
  );
}

export default Header;
