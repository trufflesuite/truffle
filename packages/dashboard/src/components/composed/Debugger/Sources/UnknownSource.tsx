interface UnknownSourceProps {
  sourceId: string;
}

function UnknownSource({ sourceId }: UnknownSourceProps): JSX.Element {
  return <pre>Could not locate source material for {sourceId}.</pre>;
}

export default UnknownSource;
