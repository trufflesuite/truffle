function UnknownSource({ address }: { address: string }): JSX.Element {
  return <pre>Could not locate source material for {address}.</pre>;
}

export default UnknownSource;
