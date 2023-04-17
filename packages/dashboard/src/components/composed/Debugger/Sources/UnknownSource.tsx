function UnknownSource({ address }: { address: string }): JSX.Element {
  return (
    <div className="truffle-debugger-unknown-source-container">
      <div className="truffle-debugger-unknown-title">Unknown Source</div>
      <div className="truffle-debugger-unknown-content">
        We're unable to locate the source material for the contract at the
        following address: {address}. Please consider recompiling with Truffle
        Dashboard running if you have the compilations locally.
      </div>
    </div>
  );
}

export default UnknownSource;
