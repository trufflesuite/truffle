import { Text } from "@mantine/core";
import { Prism } from "@mantine/prism";

type RawParamsProps = {
  data: any[];
};

function RawParams({ data }: RawParamsProps): JSX.Element {
  const paramsStringified = JSON.stringify(data, null, 2);

  return (
    <>
      <Text size="sm" color="teal" weight={700}>
        Raw parameters
      </Text>
      <Prism language="json" copyLabel="Copy to clipboard" withLineNumbers>
        {paramsStringified}
      </Prism>
    </>
  );
}

export default RawParams;
