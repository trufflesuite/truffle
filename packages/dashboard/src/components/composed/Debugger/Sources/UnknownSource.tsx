function UnknownSource({ address }: { address: string }): JSX.Element {
  return (
    <div className="truffle-debugger-source-container">
      <pre>Could not locate source material for {address}.</pre>
    </div>
  );
}

export default UnknownSource;
